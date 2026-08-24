import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, CalendarPlus, RefreshCw, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import apiService from '../services/api';
import type { City, CompanyStats, ScheduledTrip, UnifiedTicket } from '../services/api';
import AddTripModal from './AddTripModal';
import AgencyPerformance from './AgencyPerformance';
import RecentReservations from './RecentReservations';
import RecentTripsTable from './RecentTripsTable';
import SalesAnalytics from './SalesAnalytics';
import CompanyPageShell from './company/CompanyPageShell';
import { useCompanyPortal } from './CompanyLayout';
import KPICard from './ui/KPICard';

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

const CompanyDashboard: React.FC = () => {
  const { companyId, company } = useCompanyPortal();
  const [stats, setStats] = useState<CompanyStats>(emptyStats);
  const [trips, setTrips] = useState<ScheduledTrip[]>([]);
  const [reservations, setReservations] = useState<UnifiedTicket[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddTripModal, setShowAddTripModal] = useState(false);
  const requestInFlight = useRef(false);
  const mountedRef = useRef(true);
  const queuedTimeoutRef = useRef<number | null>(null);
  const activeCompanyId = useRef(String(companyId));
  const queuedRefresh = useRef<'manual' | 'silent' | null>(null);
  const loadDashboardRef = useRef<(mode?: 'initial' | 'manual' | 'silent') => Promise<void>>(async () => undefined);
  const hasLoaded = useRef(false);
  const citiesLoaded = useRef(false);
  const lastTripsLoadAt = useRef(0);
  const dashboardRef = useRef<HTMLDivElement>(null);
  const pullStart = useRef<{ x: number; y: number } | null>(null);
  activeCompanyId.current = String(companyId);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      queuedRefresh.current = null;
      if (queuedTimeoutRef.current !== null) window.clearTimeout(queuedTimeoutRef.current);
    };
  }, []);

  const loadDashboard = useCallback(async (mode: 'initial' | 'manual' | 'silent' = 'initial') => {
    if (!mountedRef.current || !companyId) return;
    if (requestInFlight.current) {
      if (mode !== 'silent' || !queuedRefresh.current) queuedRefresh.current = mode === 'initial' ? 'manual' : mode;
      return;
    }
    const requestedCompanyId = String(companyId);
    requestInFlight.current = true;
    if (mode === 'manual' && mountedRef.current) setRefreshing(true);
    if (!hasLoaded.current && mountedRef.current) setLoading(true);
    try {
      const refreshTrips = mode !== 'silent'
        || !hasLoaded.current
        || Date.now() - lastTripsLoadAt.current >= 60_000;
      const results = await Promise.allSettled([
        apiService.getCompanyStats(companyId),
        refreshTrips ? apiService.getScheduledTrips(companyId) : Promise.resolve<ScheduledTrip[] | null>(null),
        apiService.getCompanyTickets({ limit: 12, valid_sales: true }),
        citiesLoaded.current ? Promise.resolve<City[] | null>(null) : apiService.getCities(),
      ]);
      const failures: string[] = [];
      const [statsResult, tripsResult, reservationsResult, citiesResult] = results;
      if (!mountedRef.current || activeCompanyId.current !== requestedCompanyId) return;

      if (statsResult.status === 'fulfilled') setStats(statsResult.value);
      else failures.push('statistiques');
      if (tripsResult.status === 'fulfilled') {
        if (tripsResult.value) {
          setTrips(tripsResult.value);
          lastTripsLoadAt.current = Date.now();
        }
      } else failures.push('voyages');
      if (reservationsResult.status === 'fulfilled') setReservations(reservationsResult.value);
      else failures.push('ventes récentes');
      if (citiesResult.status === 'fulfilled') {
        if (citiesResult.value) setCities(citiesResult.value);
        citiesLoaded.current = true;
      } else failures.push('villes');

      if (results.some((result) => result.status === 'fulfilled')) hasLoaded.current = true;
      setError(failures.length
        ? `Actualisation partielle : ${failures.join(', ')} indisponible(s). Les autres données sont à jour.`
        : null);
    } finally {
      requestInFlight.current = false;
      if (mountedRef.current && activeCompanyId.current === requestedCompanyId) {
        setLoading(false);
        setRefreshing(false);
      }
      const queued = queuedRefresh.current;
      queuedRefresh.current = null;
      if (mountedRef.current && queued) {
        queuedTimeoutRef.current = window.setTimeout(() => {
          queuedTimeoutRef.current = null;
          void loadDashboardRef.current(queued);
        }, 0);
      }
    }
  }, [companyId]);

  loadDashboardRef.current = loadDashboard;

  useEffect(() => {
    hasLoaded.current = false;
    lastTripsLoadAt.current = 0;
    setStats(emptyStats);
    setTrips([]);
    setReservations([]);
    setLoading(true);
  }, [companyId]);

  useEffect(() => {
    void loadDashboard();
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') void loadDashboard('silent');
    };
    const dashboardElement = dashboardRef.current;
    const onTouchStart = (event: TouchEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      const interactive = target?.closest('button, a, input, textarea, select, [role="dialog"], [data-no-pull-refresh]');
      pullStart.current = window.scrollY <= 0 && event.touches.length === 1 && !interactive
        ? { x: event.touches[0].clientX, y: event.touches[0].clientY }
        : null;
    };
    const onTouchMove = (event: TouchEvent) => {
      const start = pullStart.current;
      if (!start || event.touches.length !== 1) return;
      const deltaX = Math.abs(event.touches[0].clientX - start.x);
      const deltaY = event.touches[0].clientY - start.y;
      if (deltaY < 0 || deltaX > Math.max(20, deltaY)) pullStart.current = null;
      else if (deltaY > 6 && event.cancelable) event.preventDefault();
    };
    const onTouchEnd = (event: TouchEvent) => {
      const start = pullStart.current;
      pullStart.current = null;
      if (!start || event.changedTouches.length !== 1) return;
      if (event.changedTouches[0].clientY - start.y >= 80) void loadDashboard('manual');
    };
    const onTouchCancel = () => { pullStart.current = null; };
    const interval = window.setInterval(refreshWhenVisible, 10_000);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    window.addEventListener('focus', refreshWhenVisible);
    dashboardElement?.addEventListener('touchstart', onTouchStart, { passive: true });
    dashboardElement?.addEventListener('touchmove', onTouchMove, { passive: false });
    dashboardElement?.addEventListener('touchend', onTouchEnd, { passive: true });
    dashboardElement?.addEventListener('touchcancel', onTouchCancel, { passive: true });
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
      window.removeEventListener('focus', refreshWhenVisible);
      dashboardElement?.removeEventListener('touchstart', onTouchStart);
      dashboardElement?.removeEventListener('touchmove', onTouchMove);
      dashboardElement?.removeEventListener('touchend', onTouchEnd);
      dashboardElement?.removeEventListener('touchcancel', onTouchCancel);
    };
  }, [loadDashboard]);

  const recentSales = useMemo(() => {
    const completedSales = reservations.filter((ticket) => {
      if (ticket.source === 'mobile') return ticket.status === 'paye';
      if (ticket.source === 'guichet') return ['valide', 'utilise'].includes(ticket.status);
      return ['confirmed', 'completed'].includes(ticket.status);
    });
    return completedSales.sort((left, right) => (
      new Date(right.created_at || 0).getTime() - new Date(left.created_at || 0).getTime()
    ));
  }, [reservations]);

  return (
    <>
      <div ref={dashboardRef} style={{ overscrollBehaviorY: 'contain' }}>
        <CompanyPageShell
        title="Tableau de bord"
        description={`Vue d’ensemble des ventes, voyages et opérations de ${company?.name || 'votre compagnie'}.`}
        actions={(
          <>
            <button type="button" onClick={() => void loadDashboard('manual')} disabled={refreshing || loading} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50">
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> Actualiser
            </button>
            <button type="button" onClick={() => setShowAddTripModal(true)} className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700">
              <CalendarPlus className="h-4 w-4" /> Nouveau voyage
            </button>
            <Link to="/company/utilisateurs" className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
              <Users className="h-4 w-4" /> Gérer le personnel
            </Link>
          </>
        )}
      >
        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-busy={loading}>
          <KPICard title="Voyages à venir" value={stats.scheduled_trips} note="Voyages actifs programmés" />
          <KPICard title="Billets vendus" value={stats.total_bookings} note={`${stats.mobile_bookings} mobile • ${stats.guichet_sales} guichet`} />
          <KPICard title="Revenu compagnie" value={`${Number(stats.total_revenue || 0).toLocaleString('fr-FR')} FCFA`} note={`${Number(stats.guichet_revenue || 0).toLocaleString('fr-FR')} FCFA au guichet`} />
          <KPICard title="Taux d’occupation" value={`${Math.round(Number(stats.average_occupancy || 0) * 100)}%`} note={`${stats.active_clients} clients enregistrés`} />
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <SalesAnalytics data={stats.sales_analytics} />
            <RecentTripsTable trips={trips.slice(0, 8)} />
          </div>
          <div className="space-y-6">
            <AgencyPerformance agencies={stats.agency_performance} />
            <RecentReservations reservations={recentSales} />
          </div>
        </section>
        </CompanyPageShell>
      </div>

      {showAddTripModal && (
        <AddTripModal
          isOpen={showAddTripModal}
          onClose={() => setShowAddTripModal(false)}
          onSave={() => {
            setShowAddTripModal(false);
            void loadDashboard('manual');
          }}
          editingTrip={null}
          cities={cities}
          companyId={companyId}
          requireDate
        />
      )}
    </>
  );
};

export default CompanyDashboard;
