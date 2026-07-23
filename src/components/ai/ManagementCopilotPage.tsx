import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Bot,
  Bus,
  Clock3,
  Loader2,
  MessageSquareText,
  Send,
  ShieldAlert,
  Sparkles,
  Star,
  Users,
  WalletCards,
} from 'lucide-react';

import apiService, {
  AIBookingRisk,
  AICopilotResponse,
  AIReviewAnalysis,
  AITripInsights,
} from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

interface Props {
  scope: 'admin' | 'company';
}

interface TripForecastRow extends AITripInsights {
  route: string;
  date: string;
  departureTime: string;
}

const money = (value: number) => `${Number(value || 0).toLocaleString('fr-FR')} FCFA`;

const MetricCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  tone: string;
}> = ({ icon, label, value, tone }) => (
  <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tone}`}>{icon}</div>
    <p className="mt-4 text-sm font-medium text-slate-500">{label}</p>
    <p className="mt-1 text-2xl font-extrabold text-slate-950">{value}</p>
  </article>
);

const ManagementCopilotPage: React.FC<Props> = ({ scope }) => {
  const auth = useAuth();
  const companyId = Number(auth.user?.company_id || 0);
  const [question, setQuestion] = useState('Résume la situation et les priorités du jour.');
  const [copilot, setCopilot] = useState<AICopilotResponse | null>(null);
  const [reviews, setReviews] = useState<AIReviewAnalysis | null>(null);
  const [forecasts, setForecasts] = useState<TripForecastRow[]>([]);
  const [risks, setRisks] = useState<AIBookingRisk[]>([]);
  const [loading, setLoading] = useState(true);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [delayInputs, setDelayInputs] = useState<Record<number, string>>({});

  const ask = useCallback(async (value = question) => {
    const clean = value.trim();
    if (!clean) return;
    setAsking(true);
    setError(null);
    try {
      setCopilot(await apiService.askManagementCopilot(clean));
      setQuestion(clean);
    } catch (askError: any) {
      setError(askError?.message || 'Le copilote ne répond pas pour le moment.');
    } finally {
      setAsking(false);
    }
  }, [question]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [reviewResult, rawTrips, rawTickets, initialCopilot] = await Promise.all([
        apiService.getAIReviewAnalysis().catch(() => null),
        scope === 'admin'
          ? apiService.getPlatformAdminVoyages({ status: 'upcoming' })
          : apiService.getScheduledTrips(companyId),
        scope === 'admin'
          ? apiService.getPlatformAdminTickets({ source: 'booking' })
          : apiService.getCompanyBookings(companyId),
        apiService.askManagementCopilot('Résume la situation et les priorités du jour.'),
      ]);
      setReviews(reviewResult);
      setCopilot(initialCopilot);

      const tripRows = rawTrips
        .filter((trip: any) => !trip.is_past && (!trip.date || trip.date >= new Date().toISOString().slice(0, 10)))
        .slice(0, 8);
      const insightResults = await Promise.allSettled(
        tripRows.map((trip: any) => apiService.getAITripInsights(Number(trip.id)))
      );
      setForecasts(
        insightResults.flatMap((result, index) => {
          if (result.status !== 'fulfilled') return [];
          const trip: any = tripRows[index];
          return [{
            ...result.value,
            route: trip.route || `${trip.departure_city_name || trip.departure_city} → ${trip.arrival_city_name || trip.arrival_city}`,
            date: trip.date,
            departureTime: trip.departure_time,
          }];
        })
      );

      const bookingIds = rawTickets
        .filter((ticket: any) => !ticket.source || ['booking', 'mobile'].includes(ticket.source))
        .slice(0, 15)
        .map((ticket: any) => Number(ticket.id))
        .filter(Number.isFinite);
      const riskResults = await Promise.allSettled(
        bookingIds.map((id) => apiService.getAIBookingRisk(id))
      );
      setRisks(
        riskResults
          .flatMap((result) => result.status === 'fulfilled' ? [result.value] : [])
          .sort((a, b) => b.score - a.score)
      );
    } catch (loadError: any) {
      setError(loadError?.message || 'Impossible de charger les analyses.');
    } finally {
      setLoading(false);
    }
  }, [companyId, scope]);

  useEffect(() => {
    void load();
  }, [load]);

  const reportDelay = async (tripId: number) => {
    const value = Number(delayInputs[tripId] || 0);
    if (!Number.isFinite(value) || value < 0) return;
    try {
      const updated = await apiService.reportAITripDelay(tripId, value);
      setForecasts((current) =>
        current.map((item) => item.scheduled_trip_id === tripId ? { ...item, ...updated } : item)
      );
    } catch (delayError: any) {
      setError(delayError?.message || 'Impossible de signaler le retard.');
    }
  };

  const highRisk = useMemo(() => risks.filter((item) => item.level === 'high'), [risks]);
  const averageForecast = forecasts.length
    ? Math.round(forecasts.reduce((sum, item) => sum + item.occupancy_forecast_percent, 0) / forecasts.length)
    : 0;

  return (
    <div className="space-y-7">
      <section className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950 via-blue-950 to-blue-700 p-6 text-white shadow-xl sm:p-8">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.25em] text-blue-200">
              <Sparkles className="h-4 w-4" /> Copilote EVEX
            </div>
            <h1 className="mt-4 text-3xl font-black sm:text-4xl">
              {scope === 'admin' ? 'Pilotage intelligent de la plateforme' : 'Pilotage intelligent de la compagnie'}
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-blue-100">
              Résumés, remplissage prévisionnel, retards signalés, avis clients et alertes de risque réunis au même endroit.
            </p>
          </div>
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-[2rem] border border-white/20 bg-white/10 backdrop-blur">
            <Bot className="h-11 w-11" />
          </div>
        </div>
      </section>

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}

      {loading ? (
        <div className="flex min-h-64 items-center justify-center rounded-3xl border border-slate-200 bg-white">
          <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
        </div>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard icon={<Users className="h-5 w-5" />} label="Billets confirmés" value={copilot?.metrics.confirmed_bookings || 0} tone="bg-blue-50 text-blue-700" />
            <MetricCard icon={<WalletCards className="h-5 w-5" />} label="Revenus suivis" value={money(copilot?.metrics.revenue_fcfa || 0)} tone="bg-emerald-50 text-emerald-700" />
            <MetricCard icon={<BarChart3 className="h-5 w-5" />} label="Remplissage prévu moyen" value={`${averageForecast}%`} tone="bg-violet-50 text-violet-700" />
            <MetricCard icon={<ShieldAlert className="h-5 w-5" />} label="Alertes risque élevé" value={highRisk.length} tone="bg-red-50 text-red-700" />
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700"><MessageSquareText className="h-5 w-5" /></div>
                <div><h2 className="text-lg font-bold text-slate-950">Demander au copilote</h2><p className="text-sm text-slate-500">Les réponses utilisent uniquement les indicateurs autorisés.</p></div>
              </div>
              <form onSubmit={(event) => { event.preventDefault(); void ask(); }} className="mt-5">
                <textarea value={question} onChange={(event) => setQuestion(event.target.value)} rows={3} maxLength={600} className="w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" placeholder="Ex. Quelles sont mes priorités aujourd’hui ?" />
                <button type="submit" disabled={asking || !question.trim()} className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50">
                  {asking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Analyser
                </button>
              </form>
              {copilot && (
                <div className="mt-5 rounded-2xl bg-slate-50 p-5">
                  <p className="whitespace-pre-line text-sm leading-6 text-slate-700">{copilot.answer}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {copilot.suggestions.map((suggestion) => (
                      <button key={suggestion} type="button" onClick={() => void ask(suggestion)} className="rounded-full border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700">{suggestion}</button>
                    ))}
                  </div>
                  <p className="mt-4 text-[11px] text-slate-400">{copilot.provider === 'openai' ? 'Analyse IA sécurisée' : 'Analyse EVEX hors ligne'}</p>
                </div>
              )}
            </article>

            <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between"><div><h2 className="text-lg font-bold text-slate-950">Voix du client</h2><p className="text-sm text-slate-500">Lecture automatique des avis.</p></div><Star className="h-6 w-6 text-amber-500" /></div>
              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-emerald-50 p-4"><p className="text-2xl font-black text-emerald-700">{reviews?.summary.positive || 0}</p><p className="text-xs font-semibold text-emerald-700">Positifs</p></div>
                <div className="rounded-2xl bg-red-50 p-4"><p className="text-2xl font-black text-red-700">{reviews?.summary.negative || 0}</p><p className="text-xs font-semibold text-red-700">Négatifs</p></div>
                <div className="rounded-2xl bg-slate-100 p-4"><p className="text-2xl font-black text-slate-700">{reviews?.summary.neutral || 0}</p><p className="text-xs font-semibold text-slate-600">Neutres</p></div>
                <div className="rounded-2xl bg-amber-50 p-4"><p className="text-2xl font-black text-amber-700">{reviews?.summary.urgent || 0}</p><p className="text-xs font-semibold text-amber-700">À traiter</p></div>
              </div>
            </article>
          </section>

          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between px-6 py-5">
              <div><h2 className="text-lg font-bold text-slate-950">Prévisions des prochains voyages</h2><p className="text-sm text-slate-500">Le retard reste à zéro tant qu’aucun signal réel n’est reçu.</p></div>
              <Bus className="h-6 w-6 text-blue-600" />
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Voyage</th><th className="px-5 py-3">Actuel</th><th className="px-5 py-3">Prévision</th><th className="px-5 py-3">Retard</th><th className="px-5 py-3">Signaler</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {forecasts.length === 0 && <tr><td colSpan={5} className="px-5 py-12 text-center text-slate-500">Aucun voyage à analyser.</td></tr>}
                  {forecasts.map((item) => (
                    <tr key={item.scheduled_trip_id}>
                      <td className="px-5 py-4"><p className="font-semibold text-slate-900">{item.route}</p><p className="mt-1 text-xs text-slate-500">{item.date} · {item.departureTime}</p></td>
                      <td className="px-5 py-4 font-semibold text-slate-700">{item.current_occupancy_percent}%</td>
                      <td className="px-5 py-4"><span className="rounded-full bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-700">{Math.round(item.occupancy_forecast_percent)}%</span></td>
                      <td className="px-5 py-4"><span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${item.reported_delay_minutes ? 'text-amber-700' : 'text-emerald-700'}`}><Clock3 className="h-3.5 w-3.5" />{item.delay_message}</span></td>
                      <td className="px-5 py-4"><div className="flex items-center gap-2"><input type="number" min="0" max="1440" value={delayInputs[item.scheduled_trip_id] ?? item.reported_delay_minutes} onChange={(event) => setDelayInputs((current) => ({ ...current, [item.scheduled_trip_id]: event.target.value }))} className="w-20 rounded-xl border border-slate-200 px-3 py-2 text-sm" /><button type="button" onClick={() => void reportDelay(item.scheduled_trip_id)} className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white">min</button></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between"><div><h2 className="text-lg font-bold text-slate-950">Contrôle de risque</h2><p className="text-sm text-slate-500">Les alertes assistent le contrôle humain et ne bloquent jamais seules un client.</p></div><AlertTriangle className="h-6 w-6 text-amber-500" /></div>
            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {risks.slice(0, 6).map((risk) => (
                <div key={risk.booking_id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between"><p className="font-bold text-slate-900">Billet #{risk.booking_id}</p><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${risk.level === 'high' ? 'bg-red-50 text-red-700' : risk.level === 'medium' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>{risk.score}/100</span></div>
                  <p className="mt-3 text-xs text-slate-500">{risk.flags.length ? risk.flags.join(' · ').replaceAll('_', ' ') : 'Aucun signal particulier'}</p>
                </div>
              ))}
              {risks.length === 0 && <p className="text-sm text-slate-500">Aucun billet récent à évaluer.</p>}
            </div>
          </section>
        </>
      )}
    </div>
  );
};

export default ManagementCopilotPage;
