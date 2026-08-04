import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarClock, Download, Search, Ticket, Users } from 'lucide-react';
import apiService from '../../services/api';
import type { PlatformAdminCompany, PlatformAdminTicket, PlatformAdminVoyage } from '../../services/api';
import {
  AdminError,
  AdminLoading,
  AdminMetricCard,
  AdminPageShell,
  EmptyState,
  SecondaryButton,
  StatusBadge,
  inputClass,
  money,
  number,
  selectClass,
  shortDate,
} from './AdminUI';

export const AdminVoyagesPage: React.FC = () => {
  const [voyages, setVoyages] = useState<PlatformAdminVoyage[]>([]);
  const [companies, setCompanies] = useState<PlatformAdminCompany[]>([]);
  const [filters, setFilters] = useState({ q: '', company: '', status: 'active', date: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [items, companyItems] = await Promise.all([
        apiService.getPlatformAdminVoyages(filters),
        apiService.getPlatformAdminCompanies(),
      ]);
      setVoyages(items);
      setCompanies(companyItems);
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Impossible de charger les voyages.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const id = window.setTimeout(() => void load(), 200);
    return () => window.clearTimeout(id);
  }, [load]);

  const toggle = async (voyage: PlatformAdminVoyage) => {
    const next = !voyage.is_active;
    const reason = next
      ? 'Réactivation administrative'
      : window.prompt(`Justification de l’annulation de ${voyage.route} :`, '')?.trim();
    if (!next && !reason) return;
    try {
      await apiService.setPlatformAdminVoyageStatus(voyage.id, next, reason || '');
      await load();
    } catch (err: any) {
      setError(err?.message || 'Mise à jour impossible.');
    }
  };

  const seats = voyages.reduce((sum, voyage) => sum + voyage.sold_seats, 0);
  const capacity = voyages.reduce((sum, voyage) => sum + voyage.capacity, 0);

  return (
    <AdminPageShell title="Voyages" description="Contrôlez les départs de toutes les compagnies, leur remplissage et les annulations administratives exceptionnelles.">
      <AdminError message={error} onRetry={() => void load()} />
      <section className="grid gap-4 sm:grid-cols-3">
        <AdminMetricCard label="Voyages affichés" value={number(voyages.length)} icon={<CalendarClock className="h-5 w-5" />} tone="blue" />
        <AdminMetricCard label="Places vendues" value={number(seats)} icon={<Ticket className="h-5 w-5" />} tone="emerald" />
        <AdminMetricCard label="Remplissage" value={`${capacity ? Math.round(seats / capacity * 100) : 0}%`} icon={<Users className="h-5 w-5" />} tone="amber" />
      </section>
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={filters.q} onChange={(event) => setFilters({ ...filters, q: event.target.value })} placeholder="Ville, trajet ou compagnie" className={`${inputClass} pl-10`} />
          </div>
          <select value={filters.company} onChange={(event) => setFilters({ ...filters, company: event.target.value })} className={selectClass}>
            <option value="">Toutes les compagnies</option>
            {companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
          </select>
          <select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })} className={selectClass}>
            <option value="">Tous les voyages</option>
            <option value="active">À venir actifs</option>
            <option value="inactive">Annulés</option>
            <option value="past">Passés</option>
          </select>
          <input type="date" value={filters.date} onChange={(event) => setFilters({ ...filters, date: event.target.value })} className={inputClass} />
        </div>
      </section>
      {loading ? <AdminLoading /> : voyages.length === 0 ? <EmptyState title="Aucun voyage pour ces filtres" /> : (
        <section className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr><th className="px-5 py-3">Voyage</th><th className="px-5 py-3">Compagnie</th><th className="px-5 py-3">Départ</th><th className="px-5 py-3">Remplissage</th><th className="px-5 py-3">Prix</th><th className="px-5 py-3">Statut</th><th className="px-5 py-3 text-right">Action</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {voyages.map((voyage) => (
                <tr key={voyage.id}>
                  <td className="px-5 py-4"><p className="font-semibold text-slate-900">{voyage.route}</p><p className="mt-1 text-xs text-slate-500">Voyage #{voyage.id}</p></td>
                  <td className="px-5 py-4 text-slate-600">{voyage.company_name}</td>
                  <td className="whitespace-nowrap px-5 py-4"><p className="font-medium text-slate-800">{shortDate(voyage.date)}</p><p className="text-xs text-slate-500">{voyage.departure_time}</p></td>
                  <td className="px-5 py-4"><div className="w-36"><div className="flex justify-between text-xs text-slate-500"><span>{voyage.sold_seats}/{voyage.capacity}</span><span>{voyage.occupancy_rate}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600" style={{ width: `${Math.min(voyage.occupancy_rate, 100)}%` }} /></div></div></td>
                  <td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-800">{money(voyage.price)}</td>
                  <td className="px-5 py-4"><StatusBadge active={voyage.is_active && !voyage.is_past} label={voyage.is_past ? 'Terminé' : voyage.is_active ? 'Actif' : 'Annulé'} tone={voyage.is_past ? 'slate' : voyage.is_active ? 'green' : 'red'} /></td>
                  <td className="px-5 py-4 text-right">{!voyage.is_past && <button type="button" onClick={() => void toggle(voyage)} className={`rounded-xl px-3 py-2 text-xs font-semibold ${voyage.is_active ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>{voyage.is_active ? 'Annuler' : 'Réactiver'}</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </AdminPageShell>
  );
};

const ticketStatus = (value: string) => {
  const green = ['confirmed', 'completed', 'paye', 'valide', 'utilise'];
  const red = ['cancelled', 'rembourse', 'annule', 'echoue', 'expire'];
  return <StatusBadge label={value.replace('_', ' ')} tone={green.includes(value) ? 'green' : red.includes(value) ? 'red' : 'amber'} />;
};

const AdminTicketTable: React.FC<{ tickets: PlatformAdminTicket[] }> = ({ tickets }) => (
  <div className="overflow-x-auto">
    <table className="min-w-full text-sm">
      <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
        <tr><th className="px-5 py-3">Référence</th><th className="px-5 py-3">Voyageur</th><th className="px-5 py-3">Compagnie / Voyage</th><th className="px-5 py-3">Canal</th><th className="px-5 py-3">Siège</th><th className="px-5 py-3">Montant</th><th className="px-5 py-3">Statut</th></tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {tickets.map((ticket) => (
          <tr key={`${ticket.source}-${ticket.id}`}>
            <td className="whitespace-nowrap px-5 py-4"><p className="font-semibold text-slate-900">{ticket.reference}</p><p className="mt-1 text-xs text-slate-500">Achat : {shortDate(ticket.created_at)}</p></td>
            <td className="px-5 py-4"><p className="font-medium text-slate-800">{ticket.client_name}</p><p className="text-xs text-slate-500">{ticket.client_phone}</p></td>
            <td className="px-5 py-4"><p className="font-medium text-slate-800">{ticket.company_name}</p><p className="text-xs text-slate-500">{ticket.route} · {shortDate(ticket.travel_date)} {ticket.departure_time ? `à ${ticket.departure_time}` : ''}</p></td>
            <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ticket.channel === 'guichet' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>{ticket.channel === 'guichet' ? 'Guichet' : 'Application'}</span></td>
            <td className="px-5 py-4 font-bold text-blue-700">{ticket.seat}</td>
            <td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-900">{money(ticket.amount)}</td>
            <td className="px-5 py-4">{ticketStatus(ticket.status)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export const AdminTicketsPage: React.FC = () => {
  const [tickets, setTickets] = useState<PlatformAdminTicket[]>([]);
  const [companies, setCompanies] = useState<PlatformAdminCompany[]>([]);
  const [filters, setFilters] = useState({ q: '', source: '', status: '', company: '', date: '' });
  const [groupBy, setGroupBy] = useState<'company_day' | 'company' | 'date' | 'none'>('company_day');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [items, companyItems] = await Promise.all([
        apiService.getPlatformAdminTickets(filters),
        apiService.getPlatformAdminCompanies(),
      ]);
      setTickets(items);
      setCompanies(companyItems);
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Impossible de charger les billets.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const id = window.setTimeout(() => void load(), 200);
    return () => window.clearTimeout(id);
  }, [load]);

  const valid = tickets.filter((ticket) => ['confirmed', 'completed', 'paye', 'valide', 'utilise'].includes(ticket.status));
  const groups = useMemo(() => {
    const grouped = new Map<string, { label: string; items: PlatformAdminTicket[] }>();
    tickets.forEach((ticket) => {
      const date = shortDate(ticket.travel_date);
      const key = groupBy === 'company_day'
        ? `${ticket.company_id}:${ticket.travel_date || 'sans-date'}`
        : groupBy === 'company'
          ? String(ticket.company_id)
          : groupBy === 'date'
            ? ticket.travel_date || 'sans-date'
            : 'all';
      const label = groupBy === 'company_day'
        ? `${ticket.company_name} · ${date}`
        : groupBy === 'company'
          ? ticket.company_name
          : groupBy === 'date'
            ? date
            : 'Tous les billets';
      const group = grouped.get(key) || { label, items: [] };
      group.items.push(ticket);
      grouped.set(key, group);
    });
    return Array.from(grouped.values());
  }, [groupBy, tickets]);

  return (
    <AdminPageShell
      title="Billets et réservations"
      description="Vue globale en lecture seule de tous les billets Evex, regroupés par compagnie et jour de voyage. Les annulations, modifications et remboursements relèvent des compagnies."
      actions={<SecondaryButton onClick={() => void apiService.downloadPlatformAdminExport('tickets')}><Download className="h-4 w-4" /> Exporter</SecondaryButton>}
    >
      <AdminError message={error} onRetry={() => void load()} />
      <section className="grid gap-4 sm:grid-cols-3">
        <AdminMetricCard label="Billets affichés" value={number(tickets.length)} icon={<Ticket className="h-5 w-5" />} tone="blue" />
        <AdminMetricCard label="Billets valides" value={number(valid.length)} icon={<Ticket className="h-5 w-5" />} tone="emerald" />
        <AdminMetricCard label="Montant valide" value={money(valid.reduce((sum, ticket) => sum + Number(ticket.amount), 0))} icon={<Ticket className="h-5 w-5" />} tone="amber" />
      </section>
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={filters.q} onChange={(event) => setFilters({ ...filters, q: event.target.value })} placeholder="Référence, client, téléphone" className={`${inputClass} pl-10`} /></div>
          <select value={filters.source} onChange={(event) => setFilters({ ...filters, source: event.target.value })} className={selectClass}><option value="">Tous les canaux</option><option value="mobile">Application (paiement mobile)</option><option value="booking">Application (réservation)</option><option value="guichet">Guichet</option></select>
          <select value={filters.company} onChange={(event) => setFilters({ ...filters, company: event.target.value })} className={selectClass}><option value="">Toutes les compagnies</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select>
          <select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })} className={selectClass}><option value="">Tous les statuts</option><option value="paye">Payé</option><option value="confirmed">Confirmé</option><option value="valide">Valide</option><option value="utilise">Utilisé</option><option value="annule">Annulé</option><option value="cancelled">Annulé (application)</option><option value="rembourse">Remboursé</option><option value="pending">En attente</option></select>
          <input type="date" value={filters.date} onChange={(event) => setFilters({ ...filters, date: event.target.value })} className={inputClass} aria-label="Jour de voyage" />
          <select value={groupBy} onChange={(event) => setGroupBy(event.target.value as typeof groupBy)} className={selectClass} aria-label="Regroupement"><option value="company_day">Compagnie puis jour</option><option value="company">Par compagnie</option><option value="date">Par jour de voyage</option><option value="none">Sans regroupement</option></select>
        </div>
      </section>
      {loading ? <AdminLoading /> : tickets.length === 0 ? <EmptyState title="Aucun billet trouvé" /> : (
        <div className="space-y-5">
          {groups.map((group) => (
            <section key={group.label} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
                <div><h2 className="font-bold text-slate-900">{group.label}</h2><p className="text-xs text-slate-500">{number(group.items.length)} billet(s)</p></div>
                <p className="text-sm font-semibold text-slate-700">{money(group.items.reduce((sum, ticket) => sum + Number(ticket.amount), 0))}</p>
              </header>
              <AdminTicketTable tickets={group.items} />
            </section>
          ))}
        </div>
      )}
    </AdminPageShell>
  );
};
