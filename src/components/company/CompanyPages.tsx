import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  Bus,
  CalendarPlus,
  Edit3,
  MapPinned,
  Plus,
  Save,
  Settings,
} from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import apiService from '../../services/api';
import type { Agency, AgencyCounter, Booking, City, Company, CompanyStats, GuichetAgent, ScheduledTrip, Trip } from '../../services/api';
import AddTripModal from '../AddTripModal';
import AgencyPerformance from '../AgencyPerformance';
import CreateGuichetModal from '../CreateGuichetModal';
import GuichetAgentsSection from '../GuichetAgentsSection';
import SalesAnalytics from '../SalesAnalytics';
import { useCompanyPortal } from '../CompanyLayout';
import KPICard from '../ui/KPICard';
import CompanyPageShell from './CompanyPageShell';
import AgencyModal from './AgencyModal';
import CounterModal from './CounterModal';

const emptyStats: CompanyStats = {
  scheduled_trips: 0,
  total_bookings: 0,
  mobile_bookings: 0,
  guichet_sales: 0,
  total_revenue: 0,
  mobile_revenue: 0,
  guichet_revenue: 0,
  average_occupancy: 0,
  active_clients: 0,
  agency_performance: [],
  sales_analytics: [],
  recent_guichet_sales: [],
};

const formatCurrency = (value: unknown) => `${Number(value || 0).toLocaleString('fr-FR')} FCFA`;

const formatDate = (value?: string) => {
  if (!value) return '—';
  const date = new Date(value.includes('T') ? value : `${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(date);
};

const PageError: React.FC<{ message: string | null }> = ({ message }) => message ? (
  <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {message}
  </div>
) : null;

const EmptyModule: React.FC<{ icon: React.ReactNode; title: string; description: string; action?: React.ReactNode }> = ({ icon, title, description, action }) => (
  <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">{icon}</div>
    <h2 className="mt-4 text-lg font-semibold text-slate-900">{title}</h2>
    <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-500">{description}</p>
    {action && <div className="mt-5">{action}</div>}
  </section>
);

export const CompanyProfilePage: React.FC = () => {
  const { companyId, company, loadingCompany, refreshCompany } = useCompanyPortal();
  const [form, setForm] = useState({ name: '', description: '', address: '', phone: '', email: '', website: '', logo: '' });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!company) return;
    setForm({
      name: company.name || '',
      description: company.description || '',
      address: company.address || '',
      phone: company.phone || '',
      email: company.email || '',
      website: company.website || '',
      logo: company.logo || '',
    });
  }, [company]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      await apiService.updateCompany(companyId, form as Partial<Company>);
      await refreshCompany();
      setMessage('Les informations de la compagnie ont été enregistrées.');
    } catch (saveError: any) {
      setError(saveError?.message || 'Impossible de modifier la compagnie.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <CompanyPageShell title="Ma compagnie" description="Consultez et mettez à jour l’identité et les coordonnées de votre compagnie.">
      <PageError message={error} />
      {message && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">{message}</div>}
      <form onSubmit={save} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm" aria-busy={loadingCompany || saving}>
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Nom de la compagnie" value={form.name} onChange={(value) => setForm((current) => ({ ...current, name: value }))} required />
          <Field label="Email de contact" type="email" value={form.email} onChange={(value) => setForm((current) => ({ ...current, email: value }))} required />
          <Field label="Téléphone principal" value={form.phone} onChange={(value) => setForm((current) => ({ ...current, phone: value }))} required />
          <Field label="Site web" type="url" value={form.website} onChange={(value) => setForm((current) => ({ ...current, website: value }))} />
          <Field label="Adresse du siège" value={form.address} onChange={(value) => setForm((current) => ({ ...current, address: value }))} required />
          <Field label="URL du logo" type="url" value={form.logo} onChange={(value) => setForm((current) => ({ ...current, logo: value }))} />
          <label className="md:col-span-2">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Description</span>
            <textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} rows={5} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" required />
          </label>
        </div>
        <div className="mt-6 flex justify-end">
          <button type="submit" disabled={saving || loadingCompany} className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50">
            <Save className="h-4 w-4" /> {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </CompanyPageShell>
  );
};

export const CompanyAgenciesPage: React.FC = () => {
  const { company } = useCompanyPortal();
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [agents, setAgents] = useState<GuichetAgent[]>([]);
  const [cityFilter, setCityFilter] = useState('');
  const [editing, setEditing] = useState<Agency | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [agencyData, cityData, agentData] = await Promise.all([
        apiService.getCompanyAgencies(),
        apiService.getCities(),
        apiService.getGuichetAgents(),
      ]);
      setAgencies(agencyData);
      setCities(cityData);
      setAgents(agentData);
      setError(null);
    } catch (loadError: any) {
      setError(loadError?.message || 'Impossible de charger les agences.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filteredAgencies = cityFilter
    ? agencies.filter((agency) => String(agency.ville.id) === cityFilter)
    : agencies;
  const ticketsThisMonth = agencies.reduce((sum, agency) => sum + agency.billets_vendus_mois, 0);

  const deactivate = async (agency: Agency) => {
    if (!window.confirm(`Désactiver l’agence « ${agency.nom} » ? Les données seront conservées.`)) return;
    try {
      await apiService.deactivateCompanyAgency(agency.id);
      setAgencies((current) => current.filter((item) => item.id !== agency.id));
      setMessage(`L’agence ${agency.nom} a été désactivée.`);
    } catch (deleteError: any) {
      setError(deleteError?.message || "Impossible de désactiver l'agence.");
    }
  };

  return (
    <>
      <CompanyPageShell title="Agences" description={`Gérez les bureaux physiques et points de vente de ${company?.name || 'votre compagnie'}.`} actions={<button type="button" onClick={() => { setEditing(null); setShowModal(true); }} className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"><Plus className="h-4 w-4" /> Nouvelle agence</button>}>
        <PageError message={error} />
        {message && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">{message}</div>}
        <section className="grid gap-4 sm:grid-cols-3">
          <KPICard title="Agences actives" value={agencies.filter((agency) => agency.is_active).length} note={`${agencies.length} agence(s) enregistrée(s)`} />
          <KPICard title="Avec gestionnaire" value={agencies.filter((agency) => agency.gestionnaire).length} note="Responsables affectés" />
          <KPICard title="Billets ce mois" value={ticketsThisMonth} note="Ventes rattachées aux agences" />
        </section>
        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <label className="flex max-w-sm flex-col gap-2 text-sm font-semibold text-slate-700">Filtrer par ville<select value={cityFilter} onChange={(event) => setCityFilter(event.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 font-normal outline-none focus:border-blue-500"><option value="">Toutes les villes</option>{cities.map((city) => <option key={city.id} value={city.id}>{city.name}</option>)}</select></label>
        </section>
        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3" aria-busy={loading}>
          {!loading && filteredAgencies.length === 0 && <div className="md:col-span-2 xl:col-span-3"><EmptyModule icon={<MapPinned className="h-7 w-7" />} title="Aucune agence" description="Créez votre première agence, choisissez sa ville et affectez-lui un gestionnaire." /></div>}
          {filteredAgencies.map((agency) => (
            <article key={agency.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700"><MapPinned className="h-5 w-5" /></div><StatusBadge active={agency.is_active} /></div>
              <h2 className="mt-4 text-lg font-semibold text-slate-900">{agency.nom}</h2>
              <p className="mt-1 text-sm font-medium text-blue-700">{agency.ville.nom} · {agency.ville.region}</p>
              <p className="mt-3 text-sm leading-6 text-slate-500">{agency.adresse}</p>
              <p className="mt-1 text-sm text-slate-500">{agency.telephone}</p>
              <div className="mt-5 rounded-2xl bg-slate-50 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Gestionnaire</p><p className="mt-1 text-sm font-semibold text-slate-800">{agency.gestionnaire ? `${agency.gestionnaire.prenom} ${agency.gestionnaire.nom}` : 'Non affecté'}</p><p className="mt-1 text-xs text-slate-500">{agency.nb_guichets} guichet(s) · {agency.nb_personnel} agent(s) · {agency.billets_vendus_mois} billet(s) ce mois</p></div>
              <div className="mt-5 flex flex-wrap gap-2"><Link to={`/company/agences/${agency.id}`} className="rounded-xl border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50">Détails</Link><button type="button" onClick={() => { setEditing(agency); setShowModal(true); }} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">Modifier</button><button type="button" onClick={() => void deactivate(agency)} className="rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50">Désactiver</button></div>
            </article>
          ))}
        </section>
      </CompanyPageShell>
      <AgencyModal open={showModal} agency={editing} cities={cities} agents={agents} onClose={() => setShowModal(false)} onSaved={(saved) => { setShowModal(false); setEditing(null); setMessage(`L’agence ${saved.nom} a été enregistrée.`); void load(); }} />
    </>
  );
};

export const CompanyAgencyDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [agency, setAgency] = useState<Agency | null>(null);
  const [counters, setCounters] = useState<AgencyCounter[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [agents, setAgents] = useState<GuichetAgent[]>([]);
  const [managerId, setManagerId] = useState('');
  const [showEdit, setShowEdit] = useState(false);
  const [showCounterModal, setShowCounterModal] = useState(false);
  const [editingCounter, setEditingCounter] = useState<AgencyCounter | null>(null);
  const [assignments, setAssignments] = useState<Record<number, string>>({});
  const [savingAgentId, setSavingAgentId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const [agencyData, counterData, cityData, agentData] = await Promise.all([
        apiService.getCompanyAgency(id),
        apiService.getAgencyCounters(id),
        apiService.getCities(),
        apiService.getGuichetAgents(),
      ]);
      setAgency(agencyData);
      setCounters(counterData);
      setCities(cityData);
      setAgents(agentData);
      setManagerId(agencyData.gestionnaire ? String(agencyData.gestionnaire.id) : '');
      setAssignments(Object.fromEntries(agentData.map((agent) => [
        agent.id,
        agent.agence?.id === id ? (agent.guichet?.id || 'agency') : '',
      ])));
      setError(null);
    } catch (loadError: any) {
      setError(loadError?.message || "Impossible de charger l'agence.");
    }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  const assignManager = async () => {
    if (!id) return;
    try {
      const updated = await apiService.assignCompanyAgencyManager(id, managerId ? Number(managerId) : null);
      await load();
      setMessage(updated.gestionnaire ? `${updated.gestionnaire.prenom} ${updated.gestionnaire.nom} dirige maintenant cette agence.` : 'Le gestionnaire a été retiré.');
      setError(null);
    } catch (assignError: any) {
      setError(assignError?.message || "Impossible d'affecter ce gestionnaire.");
    }
  };

  const deactivateCounter = async (counter: AgencyCounter) => {
    if (!id || !window.confirm(`Désactiver le guichet « ${counter.code} - ${counter.nom} » ?`)) return;
    try {
      await apiService.deactivateAgencyCounter(id, counter.id);
      setMessage(`Le guichet ${counter.code} a été désactivé. Ses agents restent dans l'agence sans guichet.`);
      await load();
    } catch (deleteError: any) {
      setError(deleteError?.message || 'Impossible de désactiver ce guichet.');
    }
  };

  const assignAgent = async (agent: GuichetAgent) => {
    if (!id) return;
    const destination = assignments[agent.id] || '';
    setSavingAgentId(agent.id);
    setError(null);
    try {
      await apiService.assignCompanyAgent(
        agent.id,
        destination ? id : null,
        destination && destination !== 'agency' ? destination : null,
      );
      setMessage(destination
        ? `${agent.prenom} ${agent.nom} a été affecté${destination === 'agency' ? " à l'agence" : ' au guichet sélectionné'}.`
        : `${agent.prenom} ${agent.nom} n'est plus affecté à cette agence.`);
      await load();
    } catch (assignError: any) {
      setError(assignError?.message || "Impossible de modifier l'affectation de cet agent.");
    } finally {
      setSavingAgentId(null);
    }
  };

  const assignableAgents = agents.filter((agent) => (
    agent.actif && (!agent.agence || agent.agence.id === id)
  ));

  return (
    <>
      <CompanyPageShell title={agency?.nom || 'Détail de l’agence'} description="Coordonnées, guichets, personnel et activité du point de vente." actions={agency && <button type="button" onClick={() => setShowEdit(true)} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Edit3 className="h-4 w-4" /> Modifier</button>}>
        <Link to="/company/agences" className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:underline"><ArrowLeft className="h-4 w-4" /> Retour aux agences</Link>
        <PageError message={error} />
        {message && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">{message}</div>}
        {agency && <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"><KPICard title="Ville" value={agency.ville.nom} note={agency.ville.region} /><KPICard title="Guichets actifs" value={counters.filter((counter) => counter.is_active).length} note={`${counters.length} enregistré(s)`} /><KPICard title="Personnel affecté" value={agents.filter((agent) => agent.agence?.id === agency.id).length} note={agency.gestionnaire ? 'Gestionnaire en poste' : 'Aucun responsable'} /><KPICard title="Billets ce mois" value={counters.reduce((sum, counter) => sum + counter.billets_vendus_mois, 0)} note="Toutes les ventes de l’agence" /></section>
          <section className="grid gap-6 lg:grid-cols-2">
            <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-lg font-semibold text-slate-900">Coordonnées</h2><dl className="mt-5 space-y-4 text-sm"><div><dt className="text-slate-400">Adresse</dt><dd className="mt-1 font-medium text-slate-800">{agency.adresse}</dd></div><div><dt className="text-slate-400">Téléphone</dt><dd className="mt-1 font-medium text-slate-800">{agency.telephone}</dd></div><div><dt className="text-slate-400">Statut</dt><dd className="mt-1"><StatusBadge active={agency.is_active} /></dd></div></dl></article>
            <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-lg font-semibold text-slate-900">Affecter un gestionnaire</h2><p className="mt-2 text-sm text-slate-500">Le responsable est rattaché à l’agence, au-dessus des guichets.</p><div className="mt-5 flex flex-col gap-3 sm:flex-row"><select value={managerId} onChange={(event) => setManagerId(event.target.value)} className="min-w-0 flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500"><option value="">Aucun gestionnaire</option>{agents.filter((agent) => agent.actif && (!agent.agence || agent.agence.id === agency.id)).map((agent) => <option key={agent.id} value={agent.id}>{agent.prenom} {agent.nom}</option>)}</select><button type="button" onClick={() => void assignManager()} className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700">Affecter</button></div>{agency.gestionnaire && <div className="mt-5 rounded-2xl bg-slate-50 p-4"><p className="font-semibold text-slate-900">{agency.gestionnaire.prenom} {agency.gestionnaire.nom}</p><p className="mt-1 text-sm text-slate-500">{agency.gestionnaire.email} · {agency.gestionnaire.telephone}</p></div>}</article>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">Comptoirs de vente</p><h2 className="mt-2 text-xl font-semibold text-slate-900">Guichets de l’agence</h2><p className="mt-1 text-sm text-slate-500">Chaque guichet peut recevoir plusieurs agents.</p></div><button type="button" onClick={() => { setEditingCounter(null); setShowCounterModal(true); }} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"><Plus className="h-4 w-4" /> Nouveau guichet</button></div>
            {counters.length === 0 ? <div className="mt-6 rounded-2xl border border-dashed border-slate-300 px-6 py-10 text-center"><Building2 className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3 font-semibold text-slate-700">Aucun guichet créé</p><p className="mt-1 text-sm text-slate-500">Créez par exemple « G01 — Guichet principal ».</p></div> : <div className="mt-6 grid gap-4 lg:grid-cols-2">{counters.map((counter) => { const counterAgents = agents.filter((agent) => agent.guichet?.id === counter.id); return <article key={counter.id} className="rounded-2xl border border-slate-200 p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-blue-600">{counter.code}</p><h3 className="mt-1 font-semibold text-slate-900">{counter.nom}</h3><p className="mt-1 text-sm text-slate-500">{counter.emplacement || 'Emplacement non renseigné'}</p></div><StatusBadge active={counter.is_active} /></div><div className="mt-4 grid grid-cols-3 gap-2 text-center"><div className="rounded-xl bg-slate-50 p-3"><p className="text-lg font-bold text-slate-900">{counterAgents.length}</p><p className="text-[11px] text-slate-500">Agents</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-lg font-bold text-slate-900">{counter.billets_vendus_mois}</p><p className="text-[11px] text-slate-500">Billets</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-sm font-bold text-slate-900">{formatCurrency(counter.revenu_mois)}</p><p className="text-[11px] text-slate-500">Revenu</p></div></div><div className="mt-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Agents affectés</p><p className="mt-1 text-sm text-slate-600">{counterAgents.length ? counterAgents.map((agent) => `${agent.prenom} ${agent.nom}`).join(', ') : 'Aucun agent'}</p></div><div className="mt-4 flex gap-2"><button type="button" onClick={() => { setEditingCounter(counter); setShowCounterModal(true); }} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">Modifier</button><button type="button" onClick={() => void deactivateCounter(counter)} className="rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50">Désactiver</button></div></article>; })}</div>}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">Organisation</p><h2 className="mt-2 text-xl font-semibold text-slate-900">Affectation du personnel</h2><p className="mt-1 text-sm text-slate-500">Placez chaque agent dans l’agence seule ou dans un guichet précis.</p></div>
            <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200"><table className="min-w-full divide-y divide-slate-200 text-sm"><thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Agent</th><th className="px-5 py-3">Rôle</th><th className="px-5 py-3">Affectation</th><th className="px-5 py-3 text-right">Action</th></tr></thead><tbody className="divide-y divide-slate-100">{assignableAgents.length === 0 && <tr><td colSpan={4} className="px-5 py-10 text-center text-slate-500">Aucun agent actif disponible.</td></tr>}{assignableAgents.map((agent) => <tr key={agent.id}><td className="px-5 py-4"><p className="font-semibold text-slate-900">{agent.prenom} {agent.nom}</p><p className="text-xs text-slate-500">{agent.email}</p></td><td className="px-5 py-4 text-slate-600">{agent.est_gestionnaire ? 'Gestionnaire' : 'Agent guichet'}</td><td className="px-5 py-4"><select value={assignments[agent.id] || ''} onChange={(event) => setAssignments((current) => ({ ...current, [agent.id]: event.target.value }))} className="min-w-52 rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-blue-500"><option value="">Non affecté</option><option value="agency">Agence uniquement</option>{counters.filter((counter) => counter.is_active).map((counter) => <option key={counter.id} value={counter.id}>{counter.code} — {counter.nom}</option>)}</select></td><td className="px-5 py-4 text-right"><button type="button" disabled={savingAgentId === agent.id} onClick={() => void assignAgent(agent)} className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{savingAgentId === agent.id ? 'Affectation…' : 'Enregistrer'}</button></td></tr>)}</tbody></table></div>
          </section>
        </>}
      </CompanyPageShell>
      <AgencyModal open={showEdit} agency={agency} cities={cities} agents={agents} onClose={() => setShowEdit(false)} onSaved={(saved) => { setAgency(saved); setShowEdit(false); setMessage('Les informations de l’agence ont été mises à jour.'); }} />
      {id && <CounterModal open={showCounterModal} agencyId={id} counter={editingCounter} onClose={() => setShowCounterModal(false)} onSaved={(saved) => { setShowCounterModal(false); setEditingCounter(null); setMessage(`Le guichet ${saved.code} a été enregistré.`); void load(); }} />}
    </>
  );
};

export const CompanyPersonnelPage: React.FC = () => {
  const [agents, setAgents] = useState<GuichetAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setAgents(await apiService.getGuichetAgents());
      setError(null);
    } catch (loadError: any) {
      setError(loadError?.message || 'Impossible de charger le personnel.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const toggle = async (agent: GuichetAgent) => {
    setTogglingId(agent.id);
    setError(null);
    try {
      const result = await apiService.setGuichetAgentActive(agent.id, !agent.actif);
      setAgents((current) => current.map((item) => item.id === agent.id ? { ...item, actif: result.actif } : item));
      setMessage(`${agent.prenom} ${agent.nom} a été ${result.actif ? 'activé' : 'désactivé'}.`);
    } catch (toggleError: any) {
      setError(toggleError?.message || 'Impossible de modifier ce compte.');
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <>
      <CompanyPageShell title="Personnel" description="Créez les accès guichet, activez ou suspendez les membres de votre équipe.">
        <PageError message={error} />
        {message && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">{message}</div>}
        <GuichetAgentsSection agents={agents} loading={loading} togglingAgentId={togglingId} onCreate={() => setShowCreate(true)} onToggle={toggle} />
      </CompanyPageShell>
      <CreateGuichetModal open={showCreate} onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); setMessage('Le membre a été créé.'); void load(); }} />
    </>
  );
};

export const CompanyBusesPage: React.FC = () => {
  const { companyId } = useCompanyPortal();
  const [routes, setRoutes] = useState<Trip[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId) return;
    apiService.getTrips(companyId).then(setRoutes).catch((loadError: any) => setError(loadError?.message || 'Impossible de charger les configurations de bus.'));
  }, [companyId]);

  const configurations = useMemo(() => {
    const map = new Map<string, { type: string; capacity: number; routes: number }>();
    routes.forEach((route) => {
      const key = `${route.bus_type}-${route.capacity}`;
      const current = map.get(key) || { type: route.bus_type || 'Non renseigné', capacity: route.capacity || 0, routes: 0 };
      current.routes += 1;
      map.set(key, current);
    });
    return [...map.values()];
  }, [routes]);

  return (
    <CompanyPageShell title="Bus" description="Consultez les configurations de véhicules actuellement utilisées par vos trajets.">
      <PageError message={error} />
      {configurations.length === 0 ? (
        <EmptyModule icon={<Bus className="h-7 w-7" />} title="Aucun bus enregistré" description="Le backend actuel stocke le type et la capacité sur chaque trajet, mais ne possède pas encore de registre de flotte distinct." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {configurations.map((bus) => (
            <article key={`${bus.type}-${bus.capacity}`} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700"><Bus className="h-5 w-5" /></div>
              <h2 className="mt-4 text-lg font-semibold text-slate-900">{bus.type}</h2>
              <p className="mt-1 text-sm text-slate-500">{bus.capacity} places</p>
              <p className="mt-4 text-sm font-medium text-slate-700">Utilisé sur {bus.routes} trajet{bus.routes > 1 ? 's' : ''}</p>
            </article>
          ))}
        </div>
      )}
    </CompanyPageShell>
  );
};

export const CompanyRoutesPage: React.FC = () => {
  const { companyId } = useCompanyPortal();
  const [routes, setRoutes] = useState<Trip[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [editing, setEditing] = useState<Trip | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!companyId) return;
    try {
      const [routeData, cityData] = await Promise.all([apiService.getTrips(companyId), apiService.getCities()]);
      setRoutes(routeData);
      setCities(cityData);
      setError(null);
    } catch (loadError: any) {
      setError(loadError?.message || 'Impossible de charger les trajets.');
    }
  }, [companyId]);

  useEffect(() => { void load(); }, [load]);

  const toggle = async (route: Trip) => {
    try {
      const updated = await apiService.updateTrip(route.id, { is_active: !route.is_active });
      setRoutes((current) => current.map((item) => item.id === route.id ? { ...item, ...updated } : item));
    } catch (toggleError: any) {
      setError(toggleError?.message || 'Impossible de modifier le statut du trajet.');
    }
  };

  return (
    <>
      <CompanyPageShell title="Trajets" description="Gérez les lignes permanentes, leurs horaires, tarifs et capacités." actions={<button type="button" onClick={() => { setEditing(null); setShowModal(true); }} className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white"><Plus className="h-4 w-4" /> Nouveau trajet</button>}>
        <PageError message={error} />
        <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Trajet</th><th className="px-5 py-3">Horaires</th><th className="px-5 py-3">Tarif</th><th className="px-5 py-3">Bus</th><th className="px-5 py-3">Statut</th><th className="px-5 py-3 text-right">Actions</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {routes.length === 0 && <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-500">Aucun trajet enregistré.</td></tr>}
              {routes.map((route) => (
                <tr key={route.id} className="hover:bg-slate-50">
                  <td className="px-5 py-4 font-semibold text-slate-900">{route.departure_city_name} → {route.arrival_city_name}</td>
                  <td className="px-5 py-4 text-slate-600">{route.departure_time} – {route.arrival_time}</td>
                  <td className="px-5 py-4 text-slate-700">{formatCurrency(route.price)}</td>
                  <td className="px-5 py-4 text-slate-600">{route.bus_type} · {route.capacity} places</td>
                  <td className="px-5 py-4"><StatusBadge active={route.is_active} /></td>
                  <td className="px-5 py-4 text-right"><div className="flex justify-end gap-2"><button type="button" onClick={() => { setEditing(route); setShowModal(true); }} className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50" aria-label="Modifier"><Edit3 className="h-4 w-4" /></button><button type="button" onClick={() => void toggle(route)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">{route.is_active ? 'Désactiver' : 'Activer'}</button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CompanyPageShell>
      {showModal && <AddTripModal isOpen={showModal} onClose={() => setShowModal(false)} onSave={() => { setShowModal(false); void load(); }} editingTrip={editing} cities={cities} companyId={companyId} requireDate={false} />}
    </>
  );
};

export const CompanyVoyagesPage: React.FC = () => {
  const { companyId } = useCompanyPortal();
  const [trips, setTrips] = useState<ScheduledTrip[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [editing, setEditing] = useState<ScheduledTrip | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [dateFilter, setDateFilter] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!companyId) return;
    try {
      const [tripData, cityData] = await Promise.all([apiService.getScheduledTrips(companyId), apiService.getCities()]);
      setTrips(tripData);
      setCities(cityData);
      setError(null);
    } catch (loadError: any) {
      setError(loadError?.message || 'Impossible de charger les voyages.');
    }
  }, [companyId]);

  useEffect(() => { void load(); }, [load]);
  const filtered = dateFilter ? trips.filter((trip) => trip.date === dateFilter) : trips;

  return (
    <>
      <CompanyPageShell title="Voyages" description="Programmez et suivez chaque départ daté indépendamment des trajets permanents." actions={<button type="button" onClick={() => { setEditing(null); setShowModal(true); }} className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white"><CalendarPlus className="h-4 w-4" /> Programmer un voyage</button>}>
        <PageError message={error} />
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"><label className="flex max-w-sm flex-col gap-2 text-sm font-semibold text-slate-700">Filtrer par date<input type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 font-normal outline-none focus:border-blue-500" /></label></div>
        <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Voyage</th><th className="px-5 py-3">Date</th><th className="px-5 py-3">Départ</th><th className="px-5 py-3">Places libres</th><th className="px-5 py-3">Statut</th><th className="px-5 py-3 text-right">Actions</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 && <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-500">Aucun voyage pour ce filtre.</td></tr>}
              {filtered.map((trip) => (
                <tr key={trip.scheduled_trip_id || trip.id} className="hover:bg-slate-50">
                  <td className="px-5 py-4 font-semibold text-slate-900">{trip.departure_city_name} → {trip.arrival_city_name}</td>
                  <td className="px-5 py-4 text-slate-600">{formatDate(trip.date)}</td>
                  <td className="px-5 py-4 text-slate-600">{trip.departure_time}</td>
                  <td className="px-5 py-4 text-slate-700">{trip.available_seats ?? trip.capacity} / {trip.capacity}</td>
                  <td className="px-5 py-4"><StatusBadge active={trip.is_active} /></td>
                  <td className="px-5 py-4 text-right"><div className="flex justify-end gap-2"><Link to={`/company/voyages/${trip.scheduled_trip_id || trip.id}`} className="rounded-xl border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50">Détails</Link><button type="button" onClick={() => { setEditing(trip); setShowModal(true); }} className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50" aria-label="Modifier"><Edit3 className="h-4 w-4" /></button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CompanyPageShell>
      {showModal && <AddTripModal isOpen={showModal} onClose={() => setShowModal(false)} onSave={() => { setShowModal(false); void load(); }} editingTrip={editing} cities={cities} companyId={companyId} requireDate />}
    </>
  );
};

export const CompanyVoyageDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { companyId } = useCompanyPortal();
  const [trip, setTrip] = useState<ScheduledTrip | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const tripId = Number(id);
    if (!tripId || !companyId) return;
    Promise.all([apiService.getScheduledTrip(tripId), apiService.getCompanyBookings(companyId)])
      .then(([tripData, bookingData]) => {
        setTrip(tripData);
        const routeId = (tripData as any).trip_id || (tripData as any).trip || tripData.id;
        setBookings(bookingData.filter((booking) => Number(booking.trip) === Number(routeId) && booking.travel_date === tripData.date));
      })
      .catch((loadError: any) => setError(loadError?.message || 'Impossible de charger ce voyage.'));
  }, [companyId, id]);

  const soldSeats = trip ? Math.max(Number(trip.capacity || 0) - Number(trip.available_seats ?? trip.capacity), bookings.length) : 0;
  const occupancy = trip?.capacity ? Math.round((soldSeats / trip.capacity) * 100) : 0;

  return (
    <CompanyPageShell title="Détail du voyage" description="Consultez le remplissage et les passagers rattachés à ce départ.">
      <Link to="/company/voyages" className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:underline"><ArrowLeft className="h-4 w-4" /> Retour aux voyages</Link>
      <PageError message={error} />
      {trip && (
        <>
          <section className="grid gap-4 md:grid-cols-3"><KPICard title="Trajet" value={`${trip.departure_city_name} → ${trip.arrival_city_name}`} note={`${formatDate(trip.date)} à ${trip.departure_time}`} /><KPICard title="Places vendues" value={`${soldSeats}/${trip.capacity}`} note={`${occupancy}% de remplissage`} /><KPICard title="Revenu mobile confirmé" value={formatCurrency(bookings.filter((item) => item.status === 'confirmed').reduce((sum, item) => sum + Number(item.total_price || 0), 0))} note={`${bookings.length} réservation(s) mobile`} /></section>
          <section className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm"><table className="min-w-full divide-y divide-slate-200 text-sm"><thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Passager</th><th className="px-5 py-3">Téléphone</th><th className="px-5 py-3">Siège</th><th className="px-5 py-3">Statut</th></tr></thead><tbody className="divide-y divide-slate-100">{bookings.length === 0 && <tr><td colSpan={4} className="px-5 py-12 text-center text-slate-500">Aucun passager mobile enregistré pour ce voyage.</td></tr>}{bookings.map((booking) => <tr key={booking.id}><td className="px-5 py-4 font-semibold text-slate-900">{booking.passenger_name}</td><td className="px-5 py-4 text-slate-600">{booking.passenger_phone}</td><td className="px-5 py-4 text-slate-700">{booking.seat_number}</td><td className="px-5 py-4 capitalize text-slate-600">{booking.status}</td></tr>)}</tbody></table></section>
        </>
      )}
    </CompanyPageShell>
  );
};

export const CompanyTicketsPage: React.FC = () => {
  const { companyId } = useCompanyPortal();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [stats, setStats] = useState<CompanyStats>(emptyStats);
  const [source, setSource] = useState<'all' | 'mobile' | 'guichet'>('all');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId) return;
    Promise.all([apiService.getCompanyBookings(companyId), apiService.getCompanyStats(companyId)])
      .then(([bookingData, statsData]) => { setBookings(bookingData); setStats(statsData); })
      .catch((loadError: any) => setError(loadError?.message || 'Impossible de charger les billets.'));
  }, [companyId]);

  const tickets = useMemo(() => {
    const mobile = bookings.map((booking) => ({ ...booking, source: 'mobile' as const }));
    const guichet = (stats.recent_guichet_sales || []).map((sale: any) => ({ ...sale, source: 'guichet' as const }));
    const all = [...mobile, ...guichet];
    return source === 'all' ? all : all.filter((ticket) => ticket.source === source);
  }, [bookings, source, stats.recent_guichet_sales]);

  return (
    <CompanyPageShell title="Billets" description="Retrouvez séparément les réservations mobiles et les ventes réalisées au guichet.">
      <PageError message={error} />
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><KPICard title="Total billets" value={stats.total_bookings} note="Tous les canaux" /><KPICard title="Application" value={stats.mobile_bookings} note="Réservations mobiles" /><KPICard title="Guichet" value={stats.guichet_sales} note="Ventes physiques" /><KPICard title="Revenu" value={formatCurrency(stats.total_revenue)} note="Part compagnie" /></section>
      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex flex-wrap gap-2">{(['all', 'mobile', 'guichet'] as const).map((value) => <button key={value} type="button" onClick={() => setSource(value)} className={`rounded-xl px-4 py-2 text-sm font-semibold ${source === value ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>{value === 'all' ? 'Tous' : value === 'mobile' ? 'Application' : 'Guichet'}</button>)}</div></section>
      <section className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm"><table className="min-w-full divide-y divide-slate-200 text-sm"><thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Client</th><th className="px-5 py-3">Trajet</th><th className="px-5 py-3">Siège</th><th className="px-5 py-3">Canal</th><th className="px-5 py-3">Montant</th><th className="px-5 py-3">Statut</th></tr></thead><tbody className="divide-y divide-slate-100">{tickets.length === 0 && <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-500">Aucun billet pour ce filtre.</td></tr>}{tickets.map((ticket: any, index) => <tr key={`${ticket.source}-${ticket.id || ticket.reference || index}`}><td className="px-5 py-4 font-semibold text-slate-900">{ticket.passenger_name || ticket.name || ticket.client_nom || 'Client'}</td><td className="px-5 py-4 text-slate-600">{ticket.trip_details ? `${ticket.trip_details.departure_city_name} → ${ticket.trip_details.arrival_city_name}` : ticket.route || '—'}</td><td className="px-5 py-4 text-slate-700">{ticket.seat_number || ticket.numero_siege || '—'}</td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ticket.source === 'guichet' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>{ticket.source === 'guichet' ? 'Guichet' : 'Application'}</span></td><td className="px-5 py-4 text-slate-700">{formatCurrency(ticket.total_price || ticket.amount || ticket.montant_billet)}</td><td className="px-5 py-4 capitalize text-slate-600">{ticket.status || ticket.statut || 'valide'}</td></tr>)}</tbody></table></section>
    </CompanyPageShell>
  );
};

export const CompanyRevenuePage: React.FC = () => {
  const { companyId } = useCompanyPortal();
  const [stats, setStats] = useState<CompanyStats>(emptyStats);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId) return;
    apiService.getCompanyStats(companyId).then(setStats).catch((loadError: any) => setError(loadError?.message || 'Impossible de charger les revenus.'));
  }, [companyId]);

  return (
    <CompanyPageShell title="Revenus" description="Analysez la part compagnie des ventes mobiles et guichet à partir des transactions réelles.">
      <PageError message={error} />
      <section className="grid gap-4 md:grid-cols-3"><KPICard title="Revenu total" value={formatCurrency(stats.total_revenue)} note={`${stats.total_bookings} billet(s)`} /><KPICard title="Revenu application" value={formatCurrency(stats.mobile_revenue)} note={`${stats.mobile_bookings} réservation(s)`} /><KPICard title="Revenu guichet" value={formatCurrency(stats.guichet_revenue)} note={`${stats.guichet_sales} vente(s)`} /></section>
      <section className="grid gap-6 lg:grid-cols-3"><div className="lg:col-span-2"><SalesAnalytics data={stats.sales_analytics} /></div><AgencyPerformance agencies={stats.agency_performance} /></section>
    </CompanyPageShell>
  );
};

export const CompanySettingsPage: React.FC = () => {
  const auth = useAuth();
  const navigate = useNavigate();
  return (
    <CompanyPageShell title="Paramètres" description="Gérez votre identité administrateur, la sécurité de la session et les préférences du portail.">
      <section className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700"><Settings className="h-5 w-5" /></div><div><h2 className="font-semibold text-slate-900">Profil administrateur</h2><p className="text-sm text-slate-500">{auth.user?.email || 'Email non renseigné'}</p></div></div><dl className="mt-6 space-y-3 text-sm"><div className="flex justify-between gap-4"><dt className="text-slate-500">Nom</dt><dd className="font-medium text-slate-900">{[auth.user?.first_name, auth.user?.last_name].filter(Boolean).join(' ') || 'Non renseigné'}</dd></div><div className="flex justify-between gap-4"><dt className="text-slate-500">Rôle</dt><dd className="font-medium text-slate-900">Administrateur compagnie</dd></div></dl></article>
        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="font-semibold text-slate-900">Sécurité de la session</h2><p className="mt-2 text-sm leading-6 text-slate-500">Déconnectez cette session lorsque vous avez terminé vos opérations d’administration.</p><button type="button" onClick={() => { auth.logout(); navigate('/login', { replace: true }); }} className="mt-5 rounded-2xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50">Se déconnecter</button></article>
      </section>
      <EmptyModule icon={<Settings className="h-7 w-7" />} title="Préférences avancées à connecter" description="Les notifications email/SMS, l’historique des connexions et le changement de mot de passe nécessitent encore leurs endpoints backend dédiés." />
    </CompanyPageShell>
  );
};

const Field: React.FC<{ label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }> = ({ label, value, onChange, type = 'text', required = false }) => (
  <label><span className="mb-2 block text-sm font-semibold text-slate-700">{label}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} required={required} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" /></label>
);

const StatusBadge: React.FC<{ active: boolean }> = ({ active }) => (
  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{active ? 'Actif' : 'Désactivé'}</span>
);
