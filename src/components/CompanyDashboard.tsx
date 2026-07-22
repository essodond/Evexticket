import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, CalendarPlus, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import apiService from '../services/api';
import type { Booking, City, CompanyStats, ScheduledTrip } from '../services/api';
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
  const [reservations, setReservations] = useState<Booking[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddTripModal, setShowAddTripModal] = useState(false);

  const loadDashboard = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const [statsData, tripsData, reservationsData, citiesData] = await Promise.all([
        apiService.getCompanyStats(companyId),
        apiService.getScheduledTrips(companyId),
        apiService.getCompanyBookings(companyId),
        apiService.getCities(),
      ]);
      setStats(statsData);
      setTrips(tripsData);
      setReservations(reservationsData);
      setCities(citiesData);
      setError(null);
    } catch (loadError: any) {
      setError(loadError?.message || 'Impossible de charger le tableau de bord.');
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const recentSales = useMemo(() => {
    const mobileSales = reservations.map((reservation) => ({ ...reservation, source: 'mobile' }));
    return [...mobileSales, ...(stats.recent_guichet_sales || [])].sort((left, right) => {
      const leftDate = new Date((left as any).booking_date || (left as any).created_at || 0).getTime();
      const rightDate = new Date((right as any).booking_date || (right as any).created_at || 0).getTime();
      return rightDate - leftDate;
    });
  }, [reservations, stats.recent_guichet_sales]);

  return (
    <>
      <CompanyPageShell
        title="Tableau de bord"
        description={`Vue d’ensemble des ventes, voyages et opérations de ${company?.name || 'votre compagnie'}.`}
        actions={(
          <>
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

      {showAddTripModal && (
        <AddTripModal
          isOpen={showAddTripModal}
          onClose={() => setShowAddTripModal(false)}
          onSave={() => {
            setShowAddTripModal(false);
            void loadDashboard();
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
