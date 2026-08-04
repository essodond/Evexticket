import React, { useCallback, useEffect, useState } from 'react';
import { Armchair, Bus, Clock3, Loader2, Users, X } from 'lucide-react';
import apiService from '../../services/api';
import type { GuichetTrip, UnifiedTicket } from '../../services/api';
import GuichetPageShell from './GuichetPageShell';

const todayIso = () => new Date().toISOString().slice(0, 10);
const money = (value: unknown) => `${Number(value || 0).toLocaleString('fr-FR')} FCFA`;
const displayDate = (value?: string | null) => value
  ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(new Date(`${value}T00:00:00`))
  : '—';

const sourceLabel = (ticket: UnifiedTicket) => ticket.channel === 'guichet' ? 'Guichet' : 'Application';

const ErrorMessage: React.FC<{ message: string | null }> = ({ message }) => message ? (
  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{message}</div>
) : null;

const GuichetPassengersPage: React.FC = () => {
  const [date, setDate] = useState('');
  const [trips, setTrips] = useState<GuichetTrip[]>([]);
  const [passengers, setPassengers] = useState<UnifiedTicket[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<GuichetTrip | null>(null);
  const [loading, setLoading] = useState(false);
  const [passengersLoading, setPassengersLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setTrips(await apiService.getGuichetVoyagesDisponibles(date));
      setError(null);
    } catch (loadError: any) {
      setError(loadError?.message || 'Impossible de charger les voyages.');
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    void load();
  }, [load]);

  const showPassengers = useCallback(async (trip: GuichetTrip) => {
    setSelectedTrip(trip);
    setPassengersLoading(true);
    try {
      setPassengers(await apiService.passagersVoyage(String(trip.id)));
      setError(null);
    } catch (loadError: any) {
      setError(loadError?.message || 'Impossible de charger les passagers.');
    } finally {
      setPassengersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedTrip) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedTrip(null);
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [selectedTrip]);

  const act = async (ticket: UnifiedTicket, action: 'cancel' | 'refund' | 'update') => {
    if (!selectedTrip) return;
    let reason = '';
    let changes: { client_name: string; client_phone: string; client_email?: string } | undefined;
    if (action === 'update') {
      const clientName = window.prompt('Nom complet du passager :', ticket.client_name)?.trim();
      if (!clientName) return;
      const clientPhone = window.prompt('Téléphone du passager :', ticket.client_phone)?.trim();
      if (!clientPhone) return;
      changes = { client_name: clientName, client_phone: clientPhone };
      if (ticket.client_email) changes.client_email = ticket.client_email;
    } else {
      reason = window.prompt(
        `Justification obligatoire pour ${action === 'refund' ? 'le remboursement' : 'l’annulation'} de ${ticket.reference} :`,
        '',
      )?.trim() || '';
      if (!reason) return;
    }
    try {
      const result = await apiService.actionCompanyTicket(ticket.source, ticket.id, action, reason, changes);
      await showPassengers(selectedTrip);
      window.alert(result.detail);
    } catch (actionError: any) {
      setError(actionError?.message || 'Opération impossible sur ce passager.');
    }
  };

  return (
    <GuichetPageShell
      eyebrow="Exploitation"
      title="Voyages et passagers"
      description="Liste unifiée des passagers vendus sur l’application Evex et au guichet, avec actions tracées."
    >
      <ErrorMessage message={error} />
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <label className="block max-w-xs">
          <span className="mb-2 block text-sm font-semibold text-slate-700">Jour de voyage (facultatif)</span>
          <input
            type="date"
            min={todayIso()}
            value={date}
            onChange={(event) => {
              setDate(event.target.value);
              setSelectedTrip(null);
              setPassengers([]);
            }}
            className="h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-blue-500"
          />
        </label>
        <p className="mt-2 text-xs text-slate-500">Laissez vide pour afficher tous les prochains voyages actifs.</p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {loading && <div className="md:col-span-2 xl:col-span-3 flex items-center justify-center gap-2 py-12 text-slate-500"><Loader2 className="h-5 w-5 animate-spin" /> Chargement…</div>}
        {!loading && trips.length === 0 && <div className="md:col-span-2 xl:col-span-3 rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-slate-500">{date ? `Aucun voyage actif le ${displayDate(date)}.` : 'Aucun prochain voyage actif.'}</div>}
        {trips.map((trip) => (
          <article key={trip.id} className={`rounded-3xl border bg-white p-6 shadow-sm ${selectedTrip?.id === trip.id ? 'border-blue-400 ring-4 ring-blue-50' : 'border-slate-200'}`}>
            <div className="flex items-start justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700"><Bus className="h-5 w-5" /></div>
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">Actif</span>
            </div>
            <h2 className="mt-4 text-lg font-semibold text-slate-900">{trip.trajet}</h2>
            <div className="mt-3 space-y-2 text-sm text-slate-500">
              <p className="flex items-center gap-2"><Clock3 className="h-4 w-4" /> {displayDate(trip.date)} · {trip.heure_depart} — {trip.heure_arrivee}</p>
              <p className="flex items-center gap-2"><Armchair className="h-4 w-4" /> {trip.places_libres}/{trip.places_total} places libres</p>
              <p className="font-semibold text-slate-800">{money(trip.prix)}</p>
            </div>
            <button type="button" onClick={() => void showPassengers(trip)} className="mt-5 w-full rounded-2xl border border-blue-200 px-4 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-50">Voir tous les passagers</button>
          </article>
        ))}
      </section>

      {selectedTrip && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-3 backdrop-blur-sm sm:p-6"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedTrip(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="passengers-dialog-title"
            className="flex max-h-[92vh] w-full max-w-7xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
          >
            <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:px-7">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700"><Users className="h-5 w-5" /></div>
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">Liste d’embarquement</p>
                  <h2 id="passengers-dialog-title" className="mt-1 truncate text-xl font-bold text-slate-950">Tous les passagers · {selectedTrip.trajet}</h2>
                  <p className="mt-1 text-sm text-slate-500">{displayDate(selectedTrip.date)} à {selectedTrip.heure_depart} · {passengers.length} voyageur(s)</p>
                </div>
              </div>
              <button type="button" onClick={() => setSelectedTrip(null)} className="rounded-xl p-2.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900" aria-label="Fermer la liste des passagers"><X className="h-5 w-5" /></button>
            </header>

            <div className="min-h-0 flex-1 overflow-auto">
              <table className="min-w-[1050px] w-full divide-y divide-slate-200 text-sm">
                <thead className="sticky top-0 z-10 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 shadow-sm">
                  <tr><th className="px-5 py-3">Siège</th><th className="px-5 py-3">Passager</th><th className="px-5 py-3">Référence</th><th className="px-5 py-3">Canal de vente</th><th className="px-5 py-3">Contrôle</th><th className="px-5 py-3 text-right">Actions</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {passengersLoading && <tr><td colSpan={6} className="px-5 py-16 text-center text-slate-500"><span className="inline-flex items-center gap-2"><Loader2 className="h-5 w-5 animate-spin text-blue-600" /> Chargement des passagers…</span></td></tr>}
                  {!passengersLoading && passengers.length === 0 && <tr><td colSpan={6} className="px-5 py-16 text-center"><Users className="mx-auto h-9 w-9 text-slate-300" /><p className="mt-3 font-semibold text-slate-700">Aucun passager sur ce voyage</p><p className="mt-1 text-sm text-slate-500">Les ventes de l’application et du guichet apparaîtront ici.</p></td></tr>}
                  {!passengersLoading && passengers.map((passenger) => (
                    <tr key={`${passenger.source}-${passenger.id}`} className="hover:bg-slate-50/70">
                      <td className="px-5 py-4"><span className="inline-flex h-9 min-w-9 items-center justify-center rounded-xl bg-blue-50 px-2 font-extrabold text-blue-700">{passenger.seat}</span></td>
                      <td className="px-5 py-4"><p className="font-semibold text-slate-900">{passenger.client_name}</p><p className="text-xs text-slate-500">{passenger.client_phone}</p></td>
                      <td className="px-5 py-4"><p className="font-medium text-slate-700">{passenger.reference}</p><p className="mt-1 text-xs capitalize text-slate-400">{passenger.status.replace('_', ' ')}</p></td>
                      <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${passenger.channel === 'guichet' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>{sourceLabel(passenger)}</span></td>
                      <td className="px-5 py-4 capitalize text-slate-600">{passenger.control_status?.replace('_', ' ') || 'En attente'}</td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button type="button" disabled={!passenger.can_edit} onClick={() => void act(passenger, 'update')} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30">Modifier</button>
                          <button type="button" disabled={!passenger.can_cancel} onClick={() => void act(passenger, 'cancel')} className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-30">Annuler</button>
                          <button type="button" disabled={!passenger.can_refund} onClick={() => void act(passenger, 'refund')} className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-30">Rembourser</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-5 py-4 text-xs text-slate-500 sm:px-7">
              <p><span className="font-semibold text-slate-700">Application</span> = billet acheté en ligne · <span className="font-semibold text-slate-700">Guichet</span> = billet vendu physiquement</p>
              <button type="button" onClick={() => setSelectedTrip(null)} className="rounded-xl border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-700 hover:bg-slate-100">Fermer</button>
            </footer>
          </section>
        </div>
      )}
    </GuichetPageShell>
  );
};

export default GuichetPassengersPage;
