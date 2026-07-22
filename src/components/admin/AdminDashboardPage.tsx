import React, { useCallback, useEffect, useState } from 'react';
import { Activity, Building2, BusFront, CircleDollarSign, RefreshCw, Ticket, TrendingUp, Users } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import apiService from '../../services/api';
import type { PlatformAdminDashboard } from '../../services/api';
import { AdminError, AdminLoading, AdminMetricCard, AdminPageShell, PrimaryButton, StatusBadge, dateTime, money, number } from './AdminUI';

const AdminDashboardPage: React.FC = () => {
  const [data, setData] = useState<PlatformAdminDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => { setLoading(true); try { setData(await apiService.getPlatformAdminDashboard()); setError(null); } catch (err: any) { setError(err?.message || 'Impossible de charger le tableau de bord.'); } finally { setLoading(false); } }, []);
  useEffect(() => { void load(); }, [load]);

  return <AdminPageShell title="Tableau de bord global" description="Pilotez l’activité complète d’EvexTicket avec les données consolidées de toutes les compagnies et de tous les canaux de vente." actions={<PrimaryButton onClick={() => void load()} disabled={loading}><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Actualiser</PrimaryButton>}>
    <AdminError message={error} onRetry={() => void load()} />
    {loading && !data ? <AdminLoading /> : data && <>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard label="Compagnies actives" value={`${data.overview.active_companies}/${data.overview.companies}`} note={`${data.overview.agencies} agences · ${data.overview.counters} guichets`} icon={<Building2 className="h-5 w-5" />} tone="blue" />
        <AdminMetricCard label="Utilisateurs actifs" value={number(data.overview.active_users)} note={`${number(data.overview.users)} comptes enregistrés`} icon={<Users className="h-5 w-5" />} tone="violet" />
        <AdminMetricCard label="Billets confirmés" value={number(data.overview.tickets)} note={`${data.overview.occupancy_rate}% de remplissage moyen`} icon={<Ticket className="h-5 w-5" />} tone="emerald" />
        <AdminMetricCard label="Volume encaissé" value={money(data.overview.gross_revenue)} note={`${money(data.overview.month_revenue)} ce mois`} icon={<CircleDollarSign className="h-5 w-5" />} tone="amber" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.55fr_0.85fr]">
        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="text-lg font-bold text-slate-950">Évolution de la plateforme</h2><p className="mt-1 text-sm text-slate-500">Billets et chiffre d’affaires sur 12 mois.</p></div><TrendingUp className="h-5 w-5 text-blue-600" /></div><div className="mt-6 h-80"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data.monthly}><defs><linearGradient id="adminRevenue" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#2563eb" stopOpacity={0.28}/><stop offset="95%" stopColor="#2563eb" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} width={72} tickFormatter={(value) => `${Math.round(value / 1000)}k`} /><Tooltip formatter={(value: number, name: string) => [name === 'revenue' ? money(value) : number(value), name === 'revenue' ? 'Revenus' : 'Billets']} /><Area type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={3} fill="url(#adminRevenue)" /><Area type="monotone" dataKey="tickets" stroke="#10b981" strokeWidth={2} fill="transparent" /></AreaChart></ResponsiveContainer></div></article>
        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-lg font-bold text-slate-950">Situation financière</h2><div className="mt-5 space-y-4"><FinanceRow label="Revenu net EVEX" value={money(data.overview.evex_revenue)} tone="text-blue-700" /><FinanceRow label="Part compagnies" value={money(data.overview.company_due)} tone="text-emerald-700" /><FinanceRow label="Voyages à venir" value={number(data.overview.upcoming_trips)} tone="text-slate-900" /><FinanceRow label="Trajets actifs" value={number(data.overview.routes)} tone="text-slate-900" /></div></article>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"><div className="px-6 py-5"><h2 className="text-lg font-bold text-slate-950">Classement des compagnies</h2><p className="mt-1 text-sm text-slate-500">Performance cumulée par volume de vente.</p></div><div className="overflow-x-auto"><table className="min-w-full text-sm"><thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Compagnie</th><th className="px-5 py-3">Billets</th><th className="px-5 py-3">Revenus</th><th className="px-5 py-3">Statut</th></tr></thead><tbody className="divide-y divide-slate-100">{data.top_companies.map((company) => <tr key={company.id}><td className="px-5 py-4 font-semibold text-slate-900">{company.name}</td><td className="px-5 py-4 text-slate-600">{number(company.tickets)}</td><td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-800">{money(company.revenue)}</td><td className="px-5 py-4"><StatusBadge active={company.active} /></td></tr>)}{data.top_companies.length === 0 && <tr><td colSpan={4} className="px-5 py-10 text-center text-slate-500">Aucune vente enregistrée.</td></tr>}</tbody></table></div></article>
        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-center gap-2"><Activity className="h-5 w-5 text-blue-600" /><h2 className="text-lg font-bold text-slate-950">Activité récente</h2></div><div className="mt-5 space-y-3">{data.recent_activity.map((item) => <div key={item.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-slate-900">{item.action} · {item.model}</p><p className="mt-1 line-clamp-1 text-xs text-slate-500">{item.object || 'Objet administratif'}</p></div><span className="text-[11px] text-slate-400">{dateTime(item.timestamp)}</span></div><p className="mt-2 text-xs text-slate-500">Par {item.user}</p></div>)}{data.recent_activity.length === 0 && <p className="py-10 text-center text-sm text-slate-500">Aucune activité auditée.</p>}</div></article>
      </section>

      {data.alerts.length > 0 && <section className="grid gap-4 md:grid-cols-3">{data.alerts.map((alert) => <div key={alert.title} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700"><BusFront className="h-5 w-5" /></div><div><p className="text-sm font-semibold text-slate-900">{alert.title}</p><p className="text-xs text-slate-500">{alert.value} élément(s) à contrôler</p></div></div>)}</section>}
    </>}
  </AdminPageShell>;
};

const FinanceRow: React.FC<{ label: string; value: string; tone: string }> = ({ label, value, tone }) => <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p><p className={`mt-2 text-xl font-extrabold ${tone}`}>{value}</p></div>;

export default AdminDashboardPage;
