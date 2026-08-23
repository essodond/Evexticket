import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  ExternalLink,
  MapPin,
  Plus,
  RefreshCw,
  ShieldAlert,
  Siren,
  X,
} from 'lucide-react';
import apiService from '../../services/api';
import type {
  ManageableTrackingTrip,
  SafetyIncident,
  SafetyIncidentStatus,
  SafetyIncidentType,
  SafetySeverity,
  SafetyTravelState,
} from '../../services/api';
import CompanyPageShell from './CompanyPageShell';

const incidentTypes: Array<{ value: SafetyIncidentType; label: string }> = [
  { value: 'accident', label: 'Accident' },
  { value: 'breakdown', label: 'Panne' },
  { value: 'medical', label: 'Urgence médicale' },
  { value: 'road_hazard', label: 'Danger sur la route' },
  { value: 'security', label: 'Problème de sécurité' },
  { value: 'other', label: 'Autre incident' },
];

const travelStates: Array<{ value: SafetyTravelState; label: string }> = [
  { value: 'stopped', label: 'Le véhicule est à l’arrêt' },
  { value: 'continuing', label: 'Le véhicule peut continuer' },
  { value: 'unknown', label: 'État encore inconnu' },
];

const statusStyles: Record<SafetyIncidentStatus, string> = {
  reported: 'bg-red-50 text-red-700 ring-red-200',
  acknowledged: 'bg-amber-50 text-amber-700 ring-amber-200',
  resolved: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
};

const severityStyles: Record<SafetySeverity, string> = {
  low: 'bg-slate-100 text-slate-700',
  medium: 'bg-amber-100 text-amber-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
};

const makeIdempotencyKey = () => {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    const value = character === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
};

const formatDateTime = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
};

const errorMessage = (error: unknown, fallback: string) => (
  error instanceof Error && error.message ? error.message : fallback
);

const tripLabel = (trip: ManageableTrackingTrip) => (
  `${trip.departure_city} → ${trip.arrival_city} · ${trip.date} à ${trip.departure_time.slice(0, 5)}`
);

const CompanyIncidentsPage: React.FC = () => {
  const [incidents, setIncidents] = useState<SafetyIncident[]>([]);
  const [trips, setTrips] = useState<ManageableTrackingTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tripError, setTripError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | SafetyIncidentStatus>('active');
  const [severityFilter, setSeverityFilter] = useState<'all' | SafetySeverity>('all');
  const [tripFilter, setTripFilter] = useState('all');
  const [showReport, setShowReport] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState(makeIdempotencyKey);
  const incidentRequestInFlight = useRef(false);
  const [form, setForm] = useState({
    scheduledTrip: '',
    incidentType: '' as SafetyIncidentType | '',
    travelState: '' as SafetyTravelState | '',
    description: '',
    injuredCount: '0',
    emergencyServicesContacted: false,
  });

  const loadIncidents = useCallback(async (silent = false) => {
    if (incidentRequestInFlight.current) return;
    incidentRequestInFlight.current = true;
    if (silent) setRefreshing(true);
    else setLoading(true);
    try {
      const incidentData = await apiService.getSafetyIncidents();
      setIncidents(incidentData);
      setError(null);
    } catch (loadError: unknown) {
      setError(errorMessage(loadError, 'Impossible d’actualiser les incidents. Les données affichées peuvent être anciennes.'));
    } finally {
      incidentRequestInFlight.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadTrips = useCallback(async () => {
    try {
      setTrips(await apiService.getManageableTrackingTrips());
      setTripError(null);
    } catch (loadError: unknown) {
      setTripError(errorMessage(loadError, 'Impossible de charger les voyages : le signalement est temporairement indisponible.'));
    }
  }, []);

  useEffect(() => {
    void loadIncidents();
    void loadTrips();
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') void loadIncidents(true);
    }, 15_000);
    return () => window.clearInterval(interval);
  }, [loadIncidents, loadTrips]);

  const filteredIncidents = useMemo(() => incidents.filter((incident) => {
    const statusMatches = statusFilter === 'all'
      || (statusFilter === 'active' && incident.status !== 'resolved')
      || incident.status === statusFilter;
    const severityMatches = severityFilter === 'all' || incident.severity === severityFilter;
    const tripMatches = tripFilter === 'all' || String(incident.scheduled_trip) === tripFilter;
    return statusMatches && severityMatches && tripMatches;
  }), [incidents, severityFilter, statusFilter, tripFilter]);
  const reportableTrips = useMemo(
    () => trips.filter((trip) => trip.incident_reportable),
    [trips],
  );

  const stats = useMemo(() => ({
    open: incidents.filter((incident) => incident.status !== 'resolved').length,
    critical: incidents.filter((incident) => incident.status !== 'resolved' && incident.severity === 'critical').length,
    acknowledged: incidents.filter((incident) => incident.status === 'acknowledged').length,
    resolvedToday: incidents.filter((incident) => (
      incident.status === 'resolved'
      && incident.resolved_at
      && new Date(incident.resolved_at).toDateString() === new Date().toDateString()
    )).length,
  }), [incidents]);

  const openReport = () => {
    setIdempotencyKey(makeIdempotencyKey());
    setFormError(null);
    setForm({
      scheduledTrip: '',
      incidentType: '',
      travelState: '',
      description: '',
      injuredCount: '0',
      emergencyServicesContacted: false,
    });
    setShowReport(true);
  };

  const submitReport = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.scheduledTrip) {
      setFormError('Sélectionnez le voyage concerné.');
      return;
    }
    if (!form.incidentType || !form.travelState) {
      setFormError('Sélectionnez le type d’incident et l’état du véhicule.');
      return;
    }
    const injuredCount = Number(form.injuredCount);
    if (!Number.isInteger(injuredCount) || injuredCount < 0 || injuredCount > 999) {
      setFormError('Le nombre de blessés doit être compris entre 0 et 999.');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      await apiService.reportSafetyIncident(form.scheduledTrip, {
        incident_type: form.incidentType,
        travel_state: form.travelState,
        description: form.description.trim(),
        injured_count: injuredCount,
        emergency_services_contacted: form.emergencyServicesContacted,
        idempotency_key: idempotencyKey,
      });
      setShowReport(false);
      setForm((current) => ({
        ...current,
        description: '',
        injuredCount: '0',
        emergencyServicesContacted: false,
      }));
      await loadIncidents(true);
    } catch (submitError: unknown) {
      setFormError(errorMessage(submitError, 'Signalement non envoyé. Vérifiez la connexion puis réessayez.'));
    } finally {
      setSubmitting(false);
    }
  };

  const acknowledge = async (incident: SafetyIncident) => {
    setProcessingId(incident.id);
    try {
      await apiService.updateSafetyIncident(incident.id, { status: 'acknowledged' });
      await loadIncidents(true);
    } catch (actionError: unknown) {
      setError(errorMessage(actionError, 'Impossible de prendre en charge cet incident.'));
    } finally {
      setProcessingId(null);
    }
  };

  const resolve = async (incident: SafetyIncident) => {
    const note = window.prompt('Note de résolution obligatoire : que s’est-il passé et quelle action a été prise ?');
    if (!note?.trim()) return;
    setProcessingId(incident.id);
    try {
      await apiService.updateSafetyIncident(incident.id, {
        status: 'resolved',
        resolution_note: note.trim(),
      });
      await loadIncidents(true);
    } catch (actionError: unknown) {
      setError(errorMessage(actionError, 'Impossible de résoudre cet incident.'));
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <CompanyPageShell
      eyebrow="Exploitation en direct"
      title="Centre sécurité"
      description="Signalez un accident, une panne ou un danger, enregistrez la position connue et suivez la prise en charge sans exposer les détails internes aux voyageurs."
      actions={(
        <>
          <button type="button" onClick={() => void loadIncidents(true)} disabled={refreshing} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> Actualiser
          </button>
          <button type="button" onClick={openReport} className="inline-flex items-center gap-2 rounded-2xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700">
            <Plus className="h-4 w-4" /> Signaler un incident
          </button>
        </>
      )}
    >
      <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <Siren className="mt-0.5 h-5 w-5 shrink-0" />
        <p><strong>Danger immédiat :</strong> contactez directement les services d’urgence locaux. Un signalement EVEX rend l’alerte visible dans le suivi du voyage, mais ne garantit pas une notification et ne déclenche pas lui-même un appel aux secours.</p>
      </div>

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {tripError && <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{tripError}</div>}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={<ShieldAlert />} label="Incidents ouverts" value={stats.open} tone="text-red-600 bg-red-50" />
        <Metric icon={<AlertTriangle />} label="Critiques ouverts" value={stats.critical} tone="text-orange-600 bg-orange-50" />
        <Metric icon={<Clock3 />} label="Pris en charge" value={stats.acknowledged} tone="text-amber-600 bg-amber-50" />
        <Metric icon={<CheckCircle2 />} label="Résolus aujourd’hui" value={stats.resolvedToday} tone="text-emerald-600 bg-emerald-50" />
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-3">
          <label className="text-sm font-semibold text-slate-700">Statut
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-blue-500">
              <option value="active">Ouverts</option><option value="all">Tous</option><option value="reported">Signalés</option><option value="acknowledged">Pris en charge</option><option value="resolved">Résolus</option>
            </select>
          </label>
          <label className="text-sm font-semibold text-slate-700">Gravité
            <select value={severityFilter} onChange={(event) => setSeverityFilter(event.target.value as typeof severityFilter)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-blue-500">
              <option value="all">Toutes</option><option value="critical">Critique</option><option value="high">Élevée</option><option value="medium">Modérée</option><option value="low">Faible</option>
            </select>
          </label>
          <label className="text-sm font-semibold text-slate-700">Voyage
            <select value={tripFilter} onChange={(event) => setTripFilter(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-blue-500">
              <option value="all">Tous les voyages</option>{trips.map((trip) => <option key={String(trip.id)} value={String(trip.id)}>{tripLabel(trip)}</option>)}
            </select>
          </label>
        </div>
      </section>

      <section className="space-y-4" aria-busy={loading}>
        {loading ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Chargement des incidents…</div>
        ) : !error && filteredIncidents.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
            <h2 className="mt-3 font-semibold text-slate-900">Aucun incident pour ces filtres</h2>
            <p className="mt-1 text-sm text-slate-500">Le centre se met à jour automatiquement toutes les 15 secondes.</p>
          </div>
        ) : filteredIncidents.map((incident) => (
          <article key={incident.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${severityStyles[incident.severity]}`}>{incident.severity_label}</span>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${statusStyles[incident.status]}`}>{incident.status_label}</span>
                  <span className="text-xs text-slate-400">Réf. {incident.id.slice(0, 8)}</span>
                </div>
                <h2 className="mt-3 text-lg font-bold text-slate-900">{incident.incident_type_label} · {incident.route_label}</h2>
                <p className="mt-1 text-sm text-slate-500">Voyage du {incident.travel_date} · signalé {formatDateTime(incident.occurred_at)} par {incident.reporter_name || 'un membre du personnel'}</p>
                <p className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">{incident.public_message}</p>
                {incident.description && <p className="mt-3 text-sm leading-6 text-slate-600"><strong>Détail interne :</strong> {incident.description}</p>}
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">
                  <span>{incident.travel_state_label}</span>
                  <span>Blessés déclarés : {incident.injured_count}</span>
                  <span>Secours déjà contactés : {incident.emergency_services_contacted ? 'oui' : 'non / inconnu'}</span>
                  {incident.latitude != null && incident.longitude != null && (
                    <span className="inline-flex flex-wrap items-center gap-1">
                      <a href={`https://www.openstreetmap.org/?mlat=${incident.latitude}&mlon=${incident.longitude}#map=15/${incident.latitude}/${incident.longitude}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-blue-700 hover:underline">
                        <MapPin className="h-3.5 w-3.5" /> Position enregistrée {formatDateTime(incident.location_recorded_at)} <ExternalLink className="h-3 w-3" />
                      </a>
                      <span>· source {incident.location_source === 'device' ? 'appareil' : 'suivi du bus'}{incident.accuracy_m != null ? ` · précision ±${Math.round(incident.accuracy_m)} m` : ''}</span>
                    </span>
                  )}
                </div>
                {incident.resolution_note && <p className="mt-3 text-sm text-emerald-700"><strong>Résolution :</strong> {incident.resolution_note}</p>}
              </div>
              {incident.status !== 'resolved' && (
                <div className="flex shrink-0 flex-wrap gap-2">
                  {incident.status === 'reported' && <button type="button" disabled={processingId === incident.id} onClick={() => void acknowledge(incident)} className="rounded-xl border border-amber-300 px-3 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-50 disabled:opacity-50">Prendre en charge</button>}
                  <button type="button" disabled={processingId === incident.id} onClick={() => void resolve(incident)} className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">Marquer résolu</button>
                </div>
              )}
            </div>
          </article>
        ))}
      </section>

      {showReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" role="dialog" aria-modal="true" aria-labelledby="safety-report-title">
          <form onSubmit={submitReport} className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div><h2 id="safety-report-title" className="text-xl font-bold text-slate-900">Signaler un incident</h2><p className="mt-1 text-sm text-slate-500">Vérifiez soigneusement le voyage avant de publier l’alerte.</p></div>
              <button type="button" onClick={() => setShowReport(false)} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100" aria-label="Fermer"><X className="h-5 w-5" /></button>
            </div>
            <div className="mt-6 space-y-5">
              <label className="block text-sm font-semibold text-slate-700">Voyage concerné
                <select required value={form.scheduledTrip} onChange={(event) => setForm((current) => ({ ...current, scheduledTrip: event.target.value }))} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-red-500">
                  <option value="">Sélectionner un voyage en cours</option>{reportableTrips.map((trip) => <option key={String(trip.id)} value={String(trip.id)}>{tripLabel(trip)}</option>)}
                </select>
              </label>
              {!tripError && reportableTrips.length === 0 && <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">Aucun voyage n’est actuellement dans sa fenêtre d’exploitation. Les signalements en direct sont disponibles de 2 h avant le départ à 12 h après l’arrivée prévue.</div>}
              <fieldset><legend className="text-sm font-semibold text-slate-700">Type d’incident</legend><div className="mt-2 grid gap-2 sm:grid-cols-2">{incidentTypes.map((item) => <button key={item.value} type="button" onClick={() => setForm((current) => ({ ...current, incidentType: item.value }))} className={`rounded-2xl border px-4 py-3 text-left text-sm font-semibold ${form.incidentType === item.value ? 'border-red-500 bg-red-50 text-red-800' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}>{item.label}</button>)}</div></fieldset>
              <fieldset><legend className="text-sm font-semibold text-slate-700">État du véhicule</legend><div className="mt-2 grid gap-2 sm:grid-cols-3">{travelStates.map((item) => <button key={item.value} type="button" onClick={() => setForm((current) => ({ ...current, travelState: item.value }))} className={`rounded-2xl border px-3 py-3 text-sm font-semibold ${form.travelState === item.value ? 'border-blue-500 bg-blue-50 text-blue-800' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}>{item.label}</button>)}</div></fieldset>
              <label className="block text-sm font-semibold text-slate-700">Détails internes (facultatif)
                <textarea maxLength={1000} rows={4} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-red-500" placeholder="Informations utiles à l’équipe d’exploitation" />
              </label>
              <label className="block text-sm font-semibold text-slate-700">Nombre de blessés constatés
                <input type="number" min="0" max="999" inputMode="numeric" value={form.injuredCount} onChange={(event) => setForm((current) => ({ ...current, injuredCount: event.target.value }))} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-red-500" />
              </label>
              <label className="flex items-start gap-3 rounded-2xl border border-slate-200 p-4 text-sm text-slate-700"><input type="checkbox" checked={form.emergencyServicesContacted} onChange={(event) => setForm((current) => ({ ...current, emergencyServicesContacted: event.target.checked }))} className="mt-1 h-4 w-4" /><span><strong>Les services d’urgence ont déjà été contactés</strong><span className="mt-1 block text-xs text-slate-500">Cette case enregistre seulement l’information ; elle ne passe aucun appel.</span></span></label>
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"><strong>Important :</strong> EVEX ne contacte pas automatiquement les secours. En cas de danger immédiat, appelez-les directement.</div>
              {formError && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{formError}</div>}
            </div>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" onClick={() => setShowReport(false)} className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700">Annuler</button><button type="submit" disabled={submitting || !reportableTrips.length} className="rounded-2xl bg-red-600 px-5 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">{submitting ? 'Enregistrement…' : 'Enregistrer le signalement'}</button></div>
          </form>
        </div>
      )}
    </CompanyPageShell>
  );
};

const Metric: React.FC<{ icon: React.ReactNode; label: string; value: number; tone: string }> = ({ icon, label, value, tone }) => (
  <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tone}`}>{icon}</div><p className="mt-4 text-3xl font-extrabold text-slate-900">{value}</p><p className="mt-1 text-sm text-slate-500">{label}</p></article>
);

export default CompanyIncidentsPage;
