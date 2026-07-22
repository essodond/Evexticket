import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Armchair,
  Bus,
  Camera,
  CameraOff,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Loader2,
  Printer,
  QrCode,
  RefreshCw,
  Search,
  Ticket,
  TicketPlus,
  WalletCards,
  XCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import apiService from '../../services/api';
import type {
  GuichetControlsHistory,
  GuichetSale,
  GuichetSaleReceipt,
  GuichetSalesHistory,
  GuichetScanResult,
  GuichetSeatMap,
  GuichetTrip,
} from '../../services/api';
import GuichetPageShell from './GuichetPageShell';
import { useGuichetPortal } from './GuichetLayout';

const todayIso = () => new Date().toISOString().slice(0, 10);
const money = (value: unknown) => `${Number(value || 0).toLocaleString('fr-FR')} FCFA`;
const displayDate = (value?: string) => value ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(new Date(`${value}T00:00:00`)) : '—';
const displayDateTime = (value?: string) => value ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) : '—';
const fieldInput = 'h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm leading-6 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100';
const filterInput = 'h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm leading-6 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100';

const dateInputLabel = (value: string) => {
  const [year, month, day] = value.split('-');
  return year && month && day ? `${day}/${month}/${year}` : 'jj/mm/aaaa';
};

const GuichetDateInput: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { value: string; compact?: boolean }> = ({ value, compact = false, className = '', ...props }) => (
  <div className={`relative ${className}`}>
    <input
      {...props}
      type="date"
      value={value}
      className="peer absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
    />
    <div className={`flex w-full items-center justify-between border border-slate-200 bg-white text-sm text-slate-900 transition peer-focus:border-blue-500 peer-focus:ring-2 peer-focus:ring-blue-100 peer-disabled:bg-slate-100 peer-disabled:text-slate-400 ${compact ? 'h-11 rounded-xl px-3' : 'h-12 rounded-2xl px-4'}`} aria-hidden="true">
      <span className={value ? 'text-slate-900' : 'text-slate-500'}>{dateInputLabel(value)}</span>
      <CalendarDays className="h-4 w-4 shrink-0 text-slate-500" />
    </div>
  </div>
);

const GuichetSelect: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { compact?: boolean }> = ({ compact = false, className = '', children, ...props }) => (
  <div className={`relative ${className}`}>
    <select
      {...props}
      className={`w-full appearance-none border border-slate-200 bg-slate-100 text-sm leading-6 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:text-slate-400 ${compact ? 'h-11 rounded-xl pl-3 pr-10' : 'h-12 rounded-2xl pl-4 pr-11'}`}
    >
      {children}
    </select>
    <ChevronDown className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-slate-600 ${compact ? 'right-3 h-4 w-4' : 'right-4 h-4 w-4'}`} aria-hidden="true" />
  </div>
);

const ErrorMessage: React.FC<{ message: string | null }> = ({ message }) => message ? <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{message}</div> : null;

const SaleStatus: React.FC<{ status: GuichetSale['statut'] }> = ({ status }) => {
  const classes = status === 'valide' ? 'bg-emerald-50 text-emerald-700' : status === 'utilise' ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700';
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${classes}`}>{status === 'valide' ? 'Valide' : status === 'utilise' ? 'Utilisé' : 'Annulé'}</span>;
};

export const GuichetHomePage: React.FC = () => {
  const { dashboard, loading, refreshDashboard } = useGuichetPortal();
  const payments = dashboard?.stats_aujourd_hui.paiements || {};

  return (
    <GuichetPageShell title={`Bonjour ${dashboard?.agent.prenom || ''}`} description="Suivez l’activité du jour et accédez rapidement aux opérations du guichet." actions={<button type="button" onClick={() => void refreshDashboard()} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"><RefreshCw className="h-4 w-4" /> Actualiser</button>}>
      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard icon={<Ticket className="h-5 w-5" />} label="Billets vendus aujourd’hui" value={dashboard?.billets_vendus || 0} note="Ventes valides et utilisées" tone="blue" />
        <MetricCard icon={<WalletCards className="h-5 w-5" />} label="Montant collecté" value={money(dashboard?.montant_collecte)} note="Billets + frais de service" tone="emerald" />
        <MetricCard icon={<Bus className="h-5 w-5" />} label="Voyages à venir" value={dashboard?.voyages_actifs || 0} note="Départs actifs programmés" tone="amber" />
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
          <div className="flex items-center justify-between gap-4"><div><h2 className="text-lg font-semibold text-slate-900">Prochains voyages</h2><p className="mt-1 text-sm text-slate-500">Disponibilités actualisées pour les prochains départs.</p></div><Link to="/guichet/voyages" className="text-sm font-semibold text-blue-600 hover:underline">Voir tous</Link></div>
          <div className="mt-5 space-y-3">
            {loading && <div className="py-10 text-center text-sm text-slate-500">Chargement…</div>}
            {!loading && !dashboard?.voyages_du_jour.length && <div className="rounded-2xl bg-slate-50 px-5 py-10 text-center text-sm text-slate-500">Aucun voyage programmé aujourd’hui.</div>}
            {dashboard?.voyages_du_jour.map((trip) => <div key={trip.id} className="flex flex-col gap-4 rounded-2xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700"><Bus className="h-5 w-5" /></div><div><p className="font-semibold text-slate-900">{trip.trajet}</p><p className="mt-1 text-sm text-slate-500">{displayDate(trip.date)} · {trip.heure_depart} · {money(trip.prix)}</p></div></div><div className="sm:text-right"><p className="font-semibold text-slate-900">{trip.places_libres}/{trip.places_total} places libres</p><p className="mt-1 text-xs text-slate-500">{trip.places_occupees || 0} place(s) occupée(s)</p></div></div>)}
          </div>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-lg font-semibold text-slate-900">Encaissements du jour</h2><p className="mt-1 text-sm text-slate-500">Répartition par moyen de paiement.</p><div className="mt-5 space-y-3">{(['cash', 'flooz', 'tmoney'] as const).map((mode) => <div key={mode} className="rounded-2xl bg-slate-50 p-4"><div className="flex items-center justify-between"><p className="text-sm font-semibold uppercase text-slate-600">{mode === 'tmoney' ? 'T-Money' : mode}</p><p className="font-bold text-slate-900">{money(payments[mode]?.montant)}</p></div><p className="mt-1 text-xs text-slate-500">{payments[mode]?.billets || 0} billet(s)</p></div>)}</div></article>
      </section>

      <section className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center justify-between px-6 py-5"><div><h2 className="text-lg font-semibold text-slate-900">Ventes récentes</h2><p className="mt-1 text-sm text-slate-500">Vos cinq dernières opérations.</p></div><Link to="/guichet/historique" className="text-sm font-semibold text-blue-600 hover:underline">Historique</Link></div><SalesTable sales={dashboard?.ventes_recentes || []} empty="Aucune vente enregistrée." /></section>

      <div className="grid gap-3 sm:grid-cols-2"><Link to="/guichet/vente" className="flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-4 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"><TicketPlus className="h-5 w-5" /> Vendre un billet</Link><Link to="/guichet/scanner" className="flex items-center justify-center gap-2 rounded-2xl border border-blue-200 bg-white px-5 py-4 text-sm font-semibold text-blue-700 hover:bg-blue-50"><QrCode className="h-5 w-5" /> Scanner un billet</Link></div>
    </GuichetPageShell>
  );
};

export const GuichetSalePage: React.FC = () => {
  const { dashboard, refreshDashboard } = useGuichetPortal();
  const [date, setDate] = useState('');
  const [trips, setTrips] = useState<GuichetTrip[]>([]);
  const [tripId, setTripId] = useState('');
  const [seatMap, setSeatMap] = useState<GuichetSeatMap | null>(null);
  const [seat, setSeat] = useState<number | null>(null);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [payment, setPayment] = useState<'cash' | 'flooz' | 'tmoney'>('cash');
  const [receipt, setReceipt] = useState<GuichetSaleReceipt | null>(null);
  const [loadingTrips, setLoadingTrips] = useState(false);
  const [loadingSeats, setLoadingSeats] = useState(false);
  const [selling, setSelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTrips = useCallback(async () => {
    setLoadingTrips(true);
    setError(null);
    try {
      const data = await apiService.getGuichetVoyagesDisponibles(date);
      setTrips(data);
      setTripId((current) => data.some((trip) => String(trip.id) === current) ? current : data[0] ? String(data[0].id) : '');
    } catch (loadError: any) {
      setError(loadError?.message || 'Impossible de charger les voyages.');
    } finally { setLoadingTrips(false); }
  }, [date]);

  useEffect(() => { void loadTrips(); }, [loadTrips]);
  useEffect(() => {
    if (!tripId) { setSeatMap(null); setSeat(null); return; }
    setLoadingSeats(true);
    setSeat(null);
    apiService.getGuichetSieges(tripId).then(setSeatMap).catch((loadError: any) => setError(loadError?.message || 'Impossible de charger les sièges.')).finally(() => setLoadingSeats(false));
  }, [tripId]);

  const selectedTrip = trips.find((trip) => String(trip.id) === tripId);
  const sell = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!tripId || !seat) { setError('Choisissez un voyage et un siège libre.'); return; }
    setSelling(true); setError(null);
    try {
      const created = await apiService.creerVenteGuichet({ voyage_id: tripId, numero_siege: seat, client_nom: clientName.trim(), client_telephone: clientPhone.trim(), mode_paiement: payment });
      setReceipt(created); setClientName(''); setClientPhone(''); setSeat(null);
      setSeatMap(await apiService.getGuichetSieges(tripId));
      await refreshDashboard();
    } catch (saleError: any) {
      setError(saleError?.message || 'Impossible de créer cette vente.');
    } finally { setSelling(false); }
  };

  return (
    <GuichetPageShell eyebrow="Vente au comptoir" title="Vendre un billet" description="Sélectionnez un départ, choisissez un siège réellement disponible puis éditez le billet du voyageur." actions={<div className="rounded-2xl bg-blue-50 px-4 py-3 text-sm text-blue-800"><span className="font-semibold">{dashboard?.agent.guichet?.code || 'Sans guichet'}</span><span className="mx-2">·</span>{dashboard?.agent.agence?.nom || 'Sans agence'}</div>}>
      <ErrorMessage message={error} />
      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2"><label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">Date du voyage (facultatif)</span><GuichetDateInput min={todayIso()} value={date} onChange={(event) => setDate(event.target.value)} /></label><label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">Voyage</span><GuichetSelect value={tripId} onChange={(event) => setTripId(event.target.value)} disabled={loadingTrips}><option value="">Sélectionner un voyage</option>{trips.map((trip) => <option key={trip.id} value={trip.id}>{displayDate(trip.date)} · {trip.trajet} · {trip.heure_depart} · {money(trip.prix)}</option>)}</GuichetSelect></label></div>
          {selectedTrip && <div className="mt-5 grid grid-cols-3 gap-3 rounded-2xl bg-slate-50 p-4 text-center"><div><p className="text-lg font-bold text-slate-900">{selectedTrip.heure_depart}</p><p className="text-xs text-slate-500">Départ</p></div><div><p className="text-lg font-bold text-slate-900">{selectedTrip.places_libres}</p><p className="text-xs text-slate-500">Places libres</p></div><div><p className="text-lg font-bold text-slate-900">{money(selectedTrip.prix)}</p><p className="text-xs text-slate-500">Prix du billet</p></div></div>}

          <div className="mt-6"><div className="flex items-center justify-between"><div><h2 className="font-semibold text-slate-900">Choisir un siège</h2><p className="mt-1 text-xs text-slate-500">Bleu : sélectionné · Blanc : libre · Gris : occupé</p></div>{loadingSeats && <Loader2 className="h-5 w-5 animate-spin text-blue-600" />}</div>{seatMap ? <div className="mt-5 grid grid-cols-4 gap-3 sm:grid-cols-5 md:grid-cols-6">{seatMap.sieges.map((item) => { const free = item.statut === 'libre'; const selected = seat === item.numero; return <button key={item.numero} type="button" disabled={!free} onClick={() => setSeat(item.numero)} className={`flex aspect-square flex-col items-center justify-center rounded-2xl border text-sm font-bold transition ${selected ? 'border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-200' : free ? 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50' : 'cursor-not-allowed border-slate-100 bg-slate-100 text-slate-300'}`}><Armchair className="mb-1 h-4 w-4" />{item.numero}</button>; })}</div> : <div className="mt-5 rounded-2xl border border-dashed border-slate-300 px-5 py-10 text-center text-sm text-slate-500">Sélectionnez un voyage pour afficher le plan des sièges.</div>}</div>
        </section>

        <form onSubmit={sell} className="h-fit rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-lg font-semibold text-slate-900">Informations du voyageur</h2><div className="mt-5 space-y-4"><label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">Nom complet</span><input value={clientName} onChange={(event) => setClientName(event.target.value)} required className={fieldInput} /></label><label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">Téléphone</span><input type="tel" value={clientPhone} onChange={(event) => setClientPhone(event.target.value)} required className={fieldInput} /></label><label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">Paiement</span><GuichetSelect value={payment} onChange={(event) => setPayment(event.target.value as typeof payment)}><option value="cash">Espèces</option><option value="flooz">Flooz</option><option value="tmoney">T-Money</option></GuichetSelect></label></div><div className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm"><div className="flex justify-between"><span className="text-slate-500">Siège</span><span className="font-semibold text-slate-900">{seat || '—'}</span></div><div className="mt-2 flex justify-between"><span className="text-slate-500">Total estimé</span><span className="font-bold text-slate-900">{money(Number(selectedTrip?.prix || 0) + 300)}</span></div></div><button type="submit" disabled={selling || !seat || !tripId} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{selling ? <Loader2 className="h-4 w-4 animate-spin" /> : <TicketPlus className="h-4 w-4" />}{selling ? 'Création du billet…' : 'Valider et éditer le billet'}</button></form>
      </div>

      {receipt && <section className="rounded-3xl border-2 border-emerald-200 bg-white p-6 shadow-sm print:border-0 print:shadow-none"><div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex items-center gap-2 text-emerald-700"><CheckCircle2 className="h-5 w-5" /><span className="text-sm font-semibold">Vente enregistrée</span></div><h2 className="mt-2 text-2xl font-bold text-slate-900">Billet {receipt.reference_vente}</h2><p className="mt-1 text-sm text-slate-500">{receipt.voyage.trajet} · {displayDate(receipt.voyage.date)} à {receipt.voyage.heure_depart}</p></div><button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 print:hidden"><Printer className="h-4 w-4" /> Imprimer</button></div><div className="mt-6 grid gap-6 md:grid-cols-[1fr_auto]"><dl className="grid gap-4 text-sm sm:grid-cols-2"><div><dt className="text-slate-400">Voyageur</dt><dd className="mt-1 font-semibold text-slate-900">{receipt.client_nom}</dd></div><div><dt className="text-slate-400">Téléphone</dt><dd className="mt-1 font-semibold text-slate-900">{receipt.client_telephone}</dd></div><div><dt className="text-slate-400">Siège</dt><dd className="mt-1 text-2xl font-bold text-blue-700">{receipt.siege}</dd></div><div><dt className="text-slate-400">Total payé</dt><dd className="mt-1 text-xl font-bold text-slate-900">{money(receipt.montant_total)}</dd></div><div><dt className="text-slate-400">Agence</dt><dd className="mt-1 font-semibold text-slate-900">{receipt.agence || 'Sans agence'}</dd></div><div><dt className="text-slate-400">Guichet</dt><dd className="mt-1 font-semibold text-slate-900">{receipt.guichet || 'Sans guichet'}</dd></div></dl><img src={`data:image/png;base64,${receipt.qr_code_base64}`} alt={`QR du billet ${receipt.reference_vente}`} className="h-44 w-44 rounded-2xl border border-slate-200" /></div></section>}
    </GuichetPageShell>
  );
};

export const GuichetTripsPage: React.FC = () => {
  const [date, setDate] = useState('');
  const [trips, setTrips] = useState<GuichetTrip[]>([]);
  const [passengers, setPassengers] = useState<any[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<GuichetTrip | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => { setLoading(true); try { setTrips(await apiService.getGuichetVoyagesDisponibles(date)); setError(null); } catch (loadError: any) { setError(loadError?.message || 'Impossible de charger les voyages.'); } finally { setLoading(false); } }, [date]);
  useEffect(() => { void load(); }, [load]);
  const showPassengers = async (trip: GuichetTrip) => { try { setSelectedTrip(trip); setPassengers(await apiService.passagersVoyage(String(trip.id))); } catch (loadError: any) { setError(loadError?.message || 'Impossible de charger les passagers.'); } };

  return <GuichetPageShell eyebrow="Exploitation" title="Voyages" description="Consultez les départs de la compagnie et la liste des passagers attendus."><ErrorMessage message={error} /><section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><label className="block max-w-xs"><span className="mb-2 block text-sm font-semibold text-slate-700">Date des départs (facultatif)</span><GuichetDateInput min={todayIso()} value={date} onChange={(event) => { setDate(event.target.value); setSelectedTrip(null); setPassengers([]); }} /></label><p className="mt-2 text-xs text-slate-500">Laissez vide pour afficher tous les prochains voyages actifs.</p></section><section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{loading && <div className="md:col-span-2 xl:col-span-3 py-12 text-center text-slate-500">Chargement…</div>}{!loading && trips.length === 0 && <div className="md:col-span-2 xl:col-span-3 rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-slate-500">{date ? `Aucun voyage actif le ${displayDate(date)}.` : 'Aucun prochain voyage actif.'}</div>}{trips.map((trip) => <article key={trip.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-start justify-between"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700"><Bus className="h-5 w-5" /></div><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">Actif</span></div><h2 className="mt-4 text-lg font-semibold text-slate-900">{trip.trajet}</h2><div className="mt-3 space-y-2 text-sm text-slate-500"><p className="flex items-center gap-2"><Clock3 className="h-4 w-4" /> {displayDate(trip.date)} · {trip.heure_depart} — {trip.heure_arrivee}</p><p className="flex items-center gap-2"><Armchair className="h-4 w-4" /> {trip.places_libres}/{trip.places_total} places libres</p><p className="font-semibold text-slate-800">{money(trip.prix)}</p></div><button type="button" onClick={() => void showPassengers(trip)} className="mt-5 w-full rounded-2xl border border-blue-200 px-4 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-50">Voir les passagers</button></article>)}</section>{selectedTrip && <section className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm"><div className="px-6 py-5"><h2 className="text-lg font-semibold text-slate-900">Passagers · {selectedTrip.trajet}</h2><p className="mt-1 text-sm text-slate-500">{passengers.length} voyageur(s) enregistré(s).</p></div><table className="min-w-full divide-y divide-slate-200 text-sm"><thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Siège</th><th className="px-5 py-3">Passager</th><th className="px-5 py-3">Téléphone</th><th className="px-5 py-3">Canal</th><th className="px-5 py-3">Contrôle</th></tr></thead><tbody className="divide-y divide-slate-100">{passengers.length === 0 && <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-500">Aucun passager.</td></tr>}{passengers.map((passenger, index) => <tr key={`${passenger.source}-${passenger.reference}-${index}`}><td className="px-5 py-4 font-bold text-blue-700">{passenger.numero_siege}</td><td className="px-5 py-4 font-semibold text-slate-900">{passenger.client_nom}</td><td className="px-5 py-4 text-slate-600">{passenger.client_telephone}</td><td className="px-5 py-4 capitalize text-slate-600">{passenger.source}</td><td className="px-5 py-4 text-slate-600">{passenger.statut_controle}</td></tr>)}</tbody></table></section>}</GuichetPageShell>;
};

export const GuichetScannerPage: React.FC = () => {
  const { refreshDashboard } = useGuichetPortal();
  const [raw, setRaw] = useState('');
  const [result, setResult] = useState<GuichetScanResult | null>(null);
  const [historyData, setHistoryData] = useState<GuichetControlsHistory>({ total: 0, valides: 0, invalides: 0, deja_utilises: 0, controles: [] });
  const [loading, setLoading] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const processingRef = useRef(false);

  const loadHistory = useCallback(async () => { try { setHistoryData(await apiService.historiqueControlesGuichet({ date: todayIso() })); } catch { /* Le scanner reste utilisable. */ } }, []);
  useEffect(() => { void loadHistory(); }, [loadHistory]);
  const stopCamera = useCallback(() => { if (intervalRef.current) clearInterval(intervalRef.current); intervalRef.current = null; streamRef.current?.getTracks().forEach((track) => track.stop()); streamRef.current = null; setCameraActive(false); }, []);
  useEffect(() => () => stopCamera(), [stopCamera]);

  const validate = useCallback(async (value: string) => {
    if (!value.trim() || processingRef.current) return;
    processingRef.current = true; setLoading(true); setError(null);
    try { const response = await apiService.scannerQrGuichet({ qr_code_data: value.trim() }); setResult(response); setRaw(value.trim()); await Promise.all([loadHistory(), refreshDashboard()]); }
    catch (scanError: any) { setError(scanError?.message || 'Impossible de contrôler ce billet.'); }
    finally { setLoading(false); processingRef.current = false; }
  }, [loadHistory, refreshDashboard]);

  const startCamera = async () => {
    setError(null); setResult(null);
    const Detector = (window as any).BarcodeDetector;
    if (!Detector) { setError('La lecture QR par caméra n’est pas disponible dans ce navigateur. Utilisez le champ manuel.'); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      streamRef.current = stream; setCameraActive(true);
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      const detector = new Detector({ formats: ['qr_code'] });
      intervalRef.current = setInterval(async () => { if (!videoRef.current || processingRef.current) return; try { const codes = await detector.detect(videoRef.current); const value = codes?.[0]?.rawValue; if (value) { stopCamera(); await validate(value); } } catch { /* La frame suivante réessaiera. */ } }, 700);
    } catch (cameraError: any) { stopCamera(); setError(cameraError?.message || 'Impossible d’ouvrir la caméra.'); }
  };

  const resultTone = result?.resultat === 'valide' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : result?.resultat === 'deja_utilise' ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-red-200 bg-red-50 text-red-800';
  return <GuichetPageShell eyebrow="Contrôle embarquement" title="Scanner un billet" description="Lisez le QR avec la caméra ou collez son contenu pour vérifier immédiatement le billet."><ErrorMessage message={error} /><div className="grid gap-6 xl:grid-cols-[1fr_0.85fr]"><section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex flex-wrap gap-3"><button type="button" onClick={() => cameraActive ? stopCamera() : void startCamera()} className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold ${cameraActive ? 'bg-red-50 text-red-700' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>{cameraActive ? <CameraOff className="h-4 w-4" /> : <Camera className="h-4 w-4" />}{cameraActive ? 'Arrêter la caméra' : 'Ouvrir la caméra'}</button></div><div className={`mt-5 overflow-hidden rounded-2xl bg-slate-950 ${cameraActive ? 'block' : 'hidden'}`}><video ref={videoRef} muted playsInline className="aspect-video w-full object-cover" /></div><form onSubmit={(event) => { event.preventDefault(); void validate(raw); }} className="mt-6"><label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">Contenu du QR</span><textarea rows={5} value={raw} onChange={(event) => setRaw(event.target.value)} placeholder='{"type":"guichet","reference":"GUICHET-..."}' className="w-full rounded-2xl border border-slate-200 px-4 py-3 font-mono text-xs outline-none focus:border-blue-500" /></label><button type="submit" disabled={loading || !raw.trim()} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}{loading ? 'Contrôle…' : 'Valider le billet'}</button></form>{result && <div className={`mt-5 rounded-2xl border p-5 ${resultTone}`}><div className="flex items-start gap-3">{result.resultat === 'valide' ? <CheckCircle2 className="h-6 w-6 shrink-0" /> : <XCircle className="h-6 w-6 shrink-0" />}<div><p className="font-bold">{result.resultat === 'valide' ? 'Billet accepté' : result.resultat === 'deja_utilise' ? 'Billet déjà utilisé' : 'Billet refusé'}</p><p className="mt-1 text-sm">{result.message}</p>{result.reference && <p className="mt-2 text-xs font-semibold">Référence : {result.reference}</p>}</div></div></div>}</section><section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-lg font-semibold text-slate-900">Contrôles du jour</h2><div className="mt-4 grid grid-cols-3 gap-2 text-center"><div className="rounded-2xl bg-emerald-50 p-3"><p className="text-xl font-bold text-emerald-700">{historyData.valides}</p><p className="text-xs text-emerald-700">Valides</p></div><div className="rounded-2xl bg-red-50 p-3"><p className="text-xl font-bold text-red-700">{historyData.invalides}</p><p className="text-xs text-red-700">Invalides</p></div><div className="rounded-2xl bg-amber-50 p-3"><p className="text-xl font-bold text-amber-700">{historyData.deja_utilises}</p><p className="text-xs text-amber-700">Déjà lus</p></div></div><div className="mt-5 space-y-3">{historyData.controles.slice(0, 8).map((control) => <div key={control.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex items-center justify-between gap-3"><p className="truncate text-sm font-semibold text-slate-900">{control.reference || 'Sans référence'}</p><span className={`h-2.5 w-2.5 shrink-0 rounded-full ${control.resultat === 'valide' ? 'bg-emerald-500' : control.resultat === 'deja_utilise' ? 'bg-amber-500' : 'bg-red-500'}`} /></div><p className="mt-1 truncate text-xs text-slate-500">{control.message}</p><p className="mt-2 text-[11px] text-slate-400">{displayDateTime(control.created_at)}</p></div>)}{historyData.controles.length === 0 && <div className="py-10 text-center text-sm text-slate-500">Aucun contrôle aujourd’hui.</div>}</div></section></div></GuichetPageShell>;
};

export const GuichetHistoryPage: React.FC = () => {
  const { refreshDashboard } = useGuichetPortal();
  const [filters, setFilters] = useState({ date_debut: todayIso(), date_fin: todayIso(), statut: '', mode_paiement: '', q: '' });
  const [historyData, setHistoryData] = useState<GuichetSalesHistory>({ total_billets: 0, total_valides: 0, total_annules: 0, total_montant: 0, ventes: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => { setLoading(true); setError(null); try { setHistoryData(await apiService.historiqueVentesGuichet(filters)); } catch (loadError: any) { setError(loadError?.message || 'Impossible de charger l’historique.'); } finally { setLoading(false); } }, [filters]);
  useEffect(() => { void load(); }, []); // Chargement initial, les filtres suivants sont appliqués par le bouton.
  const cancel = async (sale: GuichetSale) => { if (!window.confirm(`Annuler la vente ${sale.reference_vente} ? Le siège sera libéré.`)) return; try { await apiService.annulerVenteGuichet(sale.reference_vente); await Promise.all([load(), refreshDashboard()]); } catch (cancelError: any) { setError(cancelError?.message || 'Impossible d’annuler cette vente.'); } };

  return <GuichetPageShell eyebrow="Caisse" title="Historique des ventes" description="Recherchez vos opérations, contrôlez les montants encaissés et annulez les billets encore éligibles."><ErrorMessage message={error} /><section className="grid gap-4 md:grid-cols-3"><MetricCard icon={<Ticket className="h-5 w-5" />} label="Ventes" value={historyData.total_billets} note={`${historyData.total_valides} valide(s)`} tone="blue" /><MetricCard icon={<WalletCards className="h-5 w-5" />} label="Montant encaissé" value={money(historyData.total_montant)} note="Hors ventes annulées" tone="emerald" /><MetricCard icon={<XCircle className="h-5 w-5" />} label="Annulations" value={historyData.total_annules} note="Sur la période" tone="amber" /></section><form onSubmit={(event) => { event.preventDefault(); void load(); }} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5"><FilterField label="Du"><GuichetDateInput compact value={filters.date_debut} onChange={(event) => setFilters((current) => ({ ...current, date_debut: event.target.value }))} /></FilterField><FilterField label="Au"><GuichetDateInput compact value={filters.date_fin} onChange={(event) => setFilters((current) => ({ ...current, date_fin: event.target.value }))} /></FilterField><FilterField label="Statut"><GuichetSelect compact value={filters.statut} onChange={(event) => setFilters((current) => ({ ...current, statut: event.target.value }))}><option value="">Tous</option><option value="valide">Valide</option><option value="utilise">Utilisé</option><option value="annule">Annulé</option></GuichetSelect></FilterField><FilterField label="Paiement"><GuichetSelect compact value={filters.mode_paiement} onChange={(event) => setFilters((current) => ({ ...current, mode_paiement: event.target.value }))}><option value="">Tous</option><option value="cash">Espèces</option><option value="flooz">Flooz</option><option value="tmoney">T-Money</option></GuichetSelect></FilterField><FilterField label="Recherche"><div className="flex gap-2"><input value={filters.q} onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))} placeholder="Référence ou client" className={`${filterInput} min-w-0`} /><button type="submit" className="rounded-xl bg-blue-600 p-3 text-white hover:bg-blue-700" aria-label="Rechercher">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}</button></div></FilterField></div></form><section className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm"><SalesTable sales={historyData.ventes} empty="Aucune vente pour ces filtres." onCancel={cancel} /></section></GuichetPageShell>;
};

const MetricCard: React.FC<{ icon: React.ReactNode; label: string; value: React.ReactNode; note: string; tone: 'blue' | 'emerald' | 'amber' }> = ({ icon, label, value, note, tone }) => {
  const color = tone === 'blue' ? 'bg-blue-50 text-blue-700' : tone === 'emerald' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700';
  return <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${color}`}>{icon}</div><p className="mt-4 text-sm font-medium text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold text-slate-950">{value}</p><p className="mt-1 text-xs text-slate-400">{note}</p></article>;
};

const SalesTable: React.FC<{ sales: GuichetSale[]; empty: string; onCancel?: (sale: GuichetSale) => void }> = ({ sales, empty, onCancel }) => <table className="min-w-full divide-y divide-slate-200 text-sm"><thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Référence</th><th className="px-5 py-3">Client</th><th className="px-5 py-3">Voyage</th><th className="px-5 py-3">Siège</th><th className="px-5 py-3">Paiement</th><th className="px-5 py-3">Montant</th><th className="px-5 py-3">Statut</th>{onCancel && <th className="px-5 py-3 text-right">Action</th>}</tr></thead><tbody className="divide-y divide-slate-100">{sales.length === 0 && <tr><td colSpan={onCancel ? 8 : 7} className="px-5 py-12 text-center text-slate-500">{empty}</td></tr>}{sales.map((sale) => <tr key={sale.reference_vente}><td className="whitespace-nowrap px-5 py-4"><p className="font-semibold text-slate-900">{sale.reference_vente}</p><p className="mt-1 text-xs text-slate-400">{displayDateTime(sale.created_at)}</p></td><td className="px-5 py-4"><p className="font-medium text-slate-800">{sale.client_nom}</p><p className="text-xs text-slate-500">{sale.client_telephone}</p></td><td className="px-5 py-4"><p className="font-medium text-slate-700">{sale.trajet}</p><p className="text-xs text-slate-500">{displayDate(sale.date_voyage)} · {sale.heure_depart}</p></td><td className="px-5 py-4 font-bold text-blue-700">{sale.numero_siege}</td><td className="px-5 py-4 uppercase text-slate-600">{sale.mode_paiement === 'tmoney' ? 'T-Money' : sale.mode_paiement}</td><td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-900">{money(sale.montant_total)}</td><td className="px-5 py-4"><SaleStatus status={sale.statut} /></td>{onCancel && <td className="px-5 py-4 text-right"><button type="button" disabled={!sale.annulable} onClick={() => onCancel(sale)} className="rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300">Annuler</button></td>}</tr>)}</tbody></table>;

const FilterField: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => <label className="block"><span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>{children}</label>;
