import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Plus, Edit, Trash2, Users, Download, Calendar, MapPin, DollarSign, Bus, BarChart3, FileText, Eye, XCircle } from 'lucide-react';
import apiService, { ScheduledTrip, Booking, CompanyStats, City, Trip } from '../services/api';
import { useCities } from '../hooks/useApi';
import AddTripModal from './AddTripModal';
import ConfirmationModal from './ConfirmationModal';
import NotificationModal from './NotificationModal';
import CompanyCharts from './CompanyCharts';
import { useAuth } from '../contexts/AuthContext';

interface LocalBooking extends Booking {
  trip_details?: Trip;
}

interface CompanyDashboardProps {
  logoUrl?: string;
  siteTitle?: string;
}

const CompanyDashboard: React.FC<CompanyDashboardProps> = ({ logoUrl, siteTitle }) => {
  const auth = useAuth();
  const companyId = auth.user?.company_id;
  const [activeTab, setActiveTab] = useState('trips');
  const [showAddTripModal, setShowAddTripModal] = useState(false);
  const [editingTrip, setEditingTrip] = useState<ScheduledTrip | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationData, setNotificationData] = useState({
    type: 'success' as 'success' | 'error' | 'warning' | 'info',
    title: '',
    message: ''
  });
  const [itemToDelete, setItemToDelete] = useState<{ type: 'trip' | 'booking', id: number, name: string } | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<LocalBooking | null>(null);
  const [showBookingDetails, setShowBookingDetails] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const n1Cities = useMemo(() => ["Lomé", "Tsévié", "Aného", "Atakpamé", "Sokodé", "Kara", "Dapaong", "Mango"], []);
  const filterN1Cities = useCallback((city: City) => n1Cities.includes(city.name), [n1Cities]);

  // fetch full city list and derive filtered subset locally
  const { cities: apiCities } = useCities();
  const n1ApiCities = useMemo(() => (apiCities || []).filter(filterN1Cities), [apiCities, filterN1Cities]);

  const [stats, setStats] = useState<CompanyStats | null>(null);
  const [companyName, setCompanyName] = useState<string>('');
  const [trips, setTrips] = useState<ScheduledTrip[]>([]);
  const [bookings, setBookings] = useState<LocalBooking[]>([]);

  const fetchCompanyData = async () => {
    try {
      if (!companyId) {
        console.error("Company ID not found for the authenticated user.");
        setNotificationData({
          type: 'error',
          title: 'Erreur d\'authentification',
          message: 'ID de compagnie non trouvé pour l\'utilisateur authentifié.'
        });
        setShowNotification(true);
        return;
      }
      const companyStats = await apiService.getCompanyStats(companyId);
      setStats(companyStats);

      const fetchedTrips = await apiService.getScheduledTrips(companyId);
      setTrips(fetchedTrips);

      const fetchedBookings = await apiService.getCompanyBookings(companyId);
      setBookings(fetchedBookings as any);

    } catch (e) {
      console.error('Failed to load company dashboard data', e);
      setNotificationData({
        type: 'error',
        title: 'Erreur de chargement',
        message: 'Impossible de charger les données du tableau de bord.'
      });
      setShowNotification(true);
    }
  };

  useEffect(() => {
    if (companyId) {
      fetchCompanyData();
      fetchCompanyName(companyId);
    }
  }, [companyId]);

  const fetchCompanyName = async (id: number) => {
    try {
      const company = await apiService.getCompany(id);
      setCompanyName(company.name);
    } catch (error) {
      console.error('Error fetching company name:', error);
    }
  };
  const handleSaveTrip = (trip: ScheduledTrip) => {
    if (editingTrip) {
      setTrips((prev) => prev.map((t) => (t.id === trip.id ? trip : t)));
      setNotificationData({
        type: 'success',
        title: 'Succès',
        message: 'Voyage mis à jour avec succès.'
      });
    } else {
      setTrips((prev) => [...prev, trip]);
      setNotificationData({
        type: 'success',
        title: 'Succès',
        message: 'Voyage ajouté avec succès.'
      });
    }
    setShowNotification(true);
    setShowAddTripModal(false);
    setEditingTrip(null);
    fetchCompanyData();
  };

  const handleDeleteTrip = async () => {
    if (itemToDelete && itemToDelete.type === 'trip') {
      try {
        await apiService.deleteScheduledTrip(itemToDelete.id);
        setTrips((prev) => prev.filter((trip) => trip.id !== itemToDelete.id));
        setNotificationData({
          type: 'success',
          title: 'Succès',
          message: 'Voyage supprimé avec succès.'
        });
        setShowNotification(true);
      } catch (e) {
        console.error('Failed to delete trip', e);
        setNotificationData({
          type: 'error',
          title: 'Erreur',
          message: 'Impossible de supprimer le voyage.'
        });
        setShowNotification(true);
      } finally {
        setShowDeleteModal(false);
        setItemToDelete(null);
      }
    }
  };

  const handleDeleteBooking = async () => {
    if (itemToDelete && itemToDelete.type === 'booking') {
      try {
        await apiService.deleteBooking(itemToDelete.id);
        setBookings((prev) => prev.filter((booking) => booking.id !== itemToDelete.id));
        setNotificationData({
          type: 'success',
          title: 'Succès',
          message: 'Réservation supprimée avec succès.'
        });
        setShowNotification(true);
      } catch (e) {
        console.error('Failed to delete booking', e);
        setNotificationData({
          type: 'error',
          title: 'Erreur',
          message: 'Impossible de supprimer la réservation.'
        });
        setShowNotification(true);
      } finally {
        setShowDeleteModal(false);
        setItemToDelete(null);
      }
    }
  };

  const handleCancelBooking = async (bookingId: number) => {
    try {
      await apiService.updateBooking(bookingId, { status: 'cancelled' } as any);
      await fetchCompanyData();
      setShowCancelModal(false);
      setNotificationData({
        type: 'success',
        title: 'Succès',
        message: 'Réservation annulée avec succès.'
      });
      setShowNotification(true);
    } catch (error) {
      console.error('Erreur lors de l\'annulation de la réservation:', error);
      setNotificationData({
        type: 'error',
        title: 'Erreur',
        message: 'Impossible d\'annuler la réservation.'
      });
      setShowNotification(true);
    }
  };

  const handleExportTickets = () => {
    setNotificationData({
      type: 'info',
      title: 'Exportation',
      message: 'Fonctionnalité d\'exportation de billets à implémenter.'
    });
    setShowNotification(true);
  };

  const handleDownloadReport = () => {
    setNotificationData({
      type: 'info',
      title: 'Rapport',
      message: 'Fonctionnalité de téléchargement de rapport à implémenter.'
    });
    setShowNotification(true);
  };

  // Fonction pour formater les nombres en format local
  const formatNumber = (number: number) => {
    return new Intl.NumberFormat('fr-FR').format(number);
  };

  // Fonction pour formater les montants en FCFA
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (!companyId) {
    return <div>Chargement des données de la compagnie ou non autorisé...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            {logoUrl && (
              <img src={logoUrl} alt={siteTitle || "Logo"} className="h-12 w-12 rounded-xl shadow-sm" />
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Tableau de bord
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">Compagnie <span className="font-semibold text-blue-600">{companyName}</span></p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleDownloadReport}
              className="flex items-center gap-2 px-4 py-2.5 bg-white text-gray-700 text-sm font-medium rounded-xl border border-gray-200 hover:bg-gray-50 transition-all shadow-sm"
            >
              <Download size={16} />
              Rapport
            </button>
            <button
              onClick={() => setShowAddTripModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-all shadow-sm"
            >
              <Plus size={16} />
              Nouveau voyage
            </button>
          </div>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center">
                <Bus className="h-5 w-5 text-blue-600" />
              </div>
              <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded-full uppercase tracking-wider">Voyages</span>
            </div>
            <p className="text-3xl font-extrabold text-gray-900">
              {stats?.scheduled_trips ? formatNumber(stats.scheduled_trips) : '0'}
            </p>
            <p className="text-xs text-gray-400 mt-1">Voyages programmés</p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center">
                <FileText className="h-5 w-5 text-emerald-600" />
              </div>
              <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full uppercase tracking-wider">Réservations</span>
            </div>
            <p className="text-3xl font-extrabold text-gray-900">
              {stats?.total_bookings ? formatNumber(stats.total_bookings) : '0'}
            </p>
            <p className="text-xs text-gray-400 mt-1">Total des réservations</p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-amber-600" />
              </div>
              <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-2 py-1 rounded-full uppercase tracking-wider">Revenu</span>
            </div>
            <p className="text-2xl font-extrabold text-gray-900">
              {stats?.total_revenue ? formatCurrency(stats.total_revenue) : '0'} <span className="text-sm font-normal text-gray-400">FCFA</span>
            </p>
            <p className="text-xs text-gray-400 mt-1">Chiffre d'affaires</p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="w-11 h-11 rounded-xl bg-purple-50 flex items-center justify-center">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
              <span className="text-[10px] font-semibold text-purple-600 bg-purple-50 px-2 py-1 rounded-full uppercase tracking-wider">Clients</span>
            </div>
            <p className="text-3xl font-extrabold text-gray-900">
              {stats?.active_clients ? formatNumber(stats.active_clients) : '0'}
            </p>
            <p className="text-xs text-gray-400 mt-1">Clients réguliers</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="flex gap-2 bg-white rounded-xl p-1.5 shadow-sm border border-gray-100 w-fit">
            {[{
              key: 'dashboard', label: 'Tableau de bord', icon: <BarChart3 size={16} /> },
              { key: 'trips', label: 'Voyages', icon: <Bus size={16} />, count: trips.length },
              { key: 'bookings', label: 'Réservations', icon: <FileText size={16} />, count: bookings.length },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.key
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                {tab.icon}
                {tab.label}
                {tab.count !== undefined && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    activeTab === tab.key ? 'bg-blue-500 text-blue-100' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content based on active tab */}
        {activeTab === 'dashboard' && stats && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <CompanyCharts stats={stats} />
          </div>
        )}

        {activeTab === 'trips' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Voyages programmés</h2>
              <div className="flex gap-3">
                <button
                  onClick={handleExportTickets}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
                >
                  <Download size={15} />
                  Exporter
                </button>
                <button
                  onClick={() => setShowAddTripModal(true)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus size={15} />
                  Ajouter
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gray-50/80">
                    <th className="px-6 py-3.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Trajet</th>
                    <th className="px-6 py-3.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Heure</th>
                    <th className="px-6 py-3.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Prix</th>
                    <th className="px-6 py-3.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Places</th>
                    <th className="px-6 py-3.5 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {trips.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        <Bus size={40} className="text-gray-200 mx-auto mb-3" />
                        <p className="text-gray-400 text-sm">Aucun voyage programmé</p>
                      </td>
                    </tr>
                  ) : (
                    trips.map((trip) => (
                      <tr key={trip.id} className="hover:bg-blue-50/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                              <MapPin size={14} className="text-blue-500" />
                            </div>
                            <span className="text-sm font-medium text-gray-900">
                              {trip.departure_city_display || trip.departure_city_name || 'N/A'} → {trip.arrival_city_display || trip.arrival_city_name || 'N/A'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5">
                            <Calendar size={13} className="text-gray-400" />
                            <span className="text-sm text-gray-600">{trip.date ? new Date(trip.date).toLocaleDateString('fr-FR') : 'N/A'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-medium text-gray-700">{trip.departure_time || (trip as any).trip_info?.departure_time || 'N/A'}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-bold text-blue-600">
                            {trip.price ? `${formatCurrency(Number(trip.price))}` : (trip as any).trip_info?.price ? `${formatCurrency(Number((trip as any).trip_info.price))}` : 'N/A'} <span className="text-xs font-normal text-gray-400">FCFA</span>
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
                            (trip.available_seats || 0) > 10 ? 'bg-emerald-50 text-emerald-700' :
                            (trip.available_seats || 0) > 0 ? 'bg-amber-50 text-amber-700' :
                            'bg-red-50 text-red-700'
                          }`}>
                            <Users size={12} />
                            {trip.available_seats ?? 0}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setEditingTrip(trip)}
                              className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                              title="Modifier"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => { setItemToDelete({ type: 'trip', id: trip.scheduled_trip_id || trip.id, name: `${trip.departure_city_name || ''} → ${trip.arrival_city_name || ''}` }); setShowDeleteModal(true); }}
                              className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              title="Supprimer"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'bookings' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Réservations</h2>
              <button
                onClick={handleDownloadReport}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
              >
                <Download size={15} />
                Télécharger le rapport
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gray-50/80">
                    <th className="px-6 py-3.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Voyageur</th>
                    <th className="px-6 py-3.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Trajet</th>
                    <th className="px-6 py-3.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Siège</th>
                    <th className="px-6 py-3.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Statut</th>
                    <th className="px-6 py-3.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3.5 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {bookings.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        <FileText size={40} className="text-gray-200 mx-auto mb-3" />
                        <p className="text-gray-400 text-sm">Aucune réservation</p>
                      </td>
                    </tr>
                  ) : (
                    bookings.map((booking) => (
                      <tr key={booking.id} className="hover:bg-blue-50/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                              <span className="text-xs font-bold text-blue-600">
                                {booking.passenger_name?.charAt(0)?.toUpperCase() || '?'}
                              </span>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{booking.passenger_name}</p>
                              <p className="text-xs text-gray-400">{booking.passenger_phone}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-600">
                            {booking.trip_details?.departure_city_display || booking.trip_details?.departure_city_name || '?'} → {booking.trip_details?.arrival_city_display || booking.trip_details?.arrival_city_name || '?'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center text-xs font-bold text-gray-700 bg-gray-100 px-2.5 py-1 rounded-lg">
                            {booking.seat_number}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                            booking.status === 'confirmed' ? 'bg-emerald-50 text-emerald-700' :
                            booking.status === 'cancelled' ? 'bg-red-50 text-red-600' :
                            booking.status === 'pending' ? 'bg-amber-50 text-amber-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {booking.status === 'confirmed' ? '✓ Confirmé' :
                             booking.status === 'cancelled' ? 'Annulé' :
                             booking.status === 'pending' ? 'En attente' :
                             booking.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-500">{new Date(booking.booking_date).toLocaleDateString('fr-FR')}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => { setSelectedBooking(booking); setShowBookingDetails(true); }}
                              className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                              title="Voir les détails"
                            >
                              <Eye size={16} />
                            </button>
                            {booking.status !== 'cancelled' && (
                              <button
                                onClick={() => { setSelectedBooking(booking); setShowCancelModal(true); }}
                                className="p-2 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                                title="Annuler"
                              >
                                <XCircle size={16} />
                              </button>
                            )}
                            <button
                              onClick={() => { setItemToDelete({ type: 'booking', id: booking.id, name: `Réservation de ${booking.passenger_name}` }); setShowDeleteModal(true); }}
                              className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              title="Supprimer"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modals */}
        {showAddTripModal && (
          <AddTripModal
            isOpen={showAddTripModal}
            onClose={() => { setShowAddTripModal(false); setEditingTrip(null); }}
            onSave={handleSaveTrip}
            editingTrip={editingTrip}
            cities={apiCities}
            companyId={companyId}
          />
        )}

        {showDeleteModal && itemToDelete && (
          <ConfirmationModal
            message={`Êtes-vous sûr de vouloir supprimer ${itemToDelete.name} ?`}
            onConfirm={itemToDelete.type === 'trip' ? handleDeleteTrip : handleDeleteBooking}
            onCancel={() => { setShowDeleteModal(false); setItemToDelete(null); }}
          />
        )}

        {showNotification && (
          <NotificationModal
            type={notificationData.type}
            title={notificationData.title}
            message={notificationData.message}
            onClose={() => setShowNotification(false)}
          />
        )}

        {/* Modal détails réservation */}
        {showBookingDetails && selectedBooking && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
                <h3 className="text-lg font-bold text-white">Détails de la réservation</h3>
                <p className="text-blue-200 text-sm">#{selectedBooking.id}</p>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-sm font-bold text-blue-600">{selectedBooking.passenger_name?.charAt(0)?.toUpperCase()}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{selectedBooking.passenger_name}</p>
                    <p className="text-xs text-gray-400">{selectedBooking.passenger_email}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Téléphone</p>
                    <p className="text-sm font-medium text-gray-800 mt-0.5">{selectedBooking.passenger_phone}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Siège</p>
                    <p className="text-sm font-medium text-gray-800 mt-0.5">{selectedBooking.seat_number}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Trajet</p>
                    <p className="text-sm font-medium text-gray-800 mt-0.5">{selectedBooking.trip_details?.departure_city_display || selectedBooking.trip_details?.departure_city_name} → {selectedBooking.trip_details?.arrival_city_display || selectedBooking.trip_details?.arrival_city_name}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Statut</p>
                    <span className={`inline-flex mt-0.5 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                      selectedBooking.status === 'confirmed' ? 'bg-emerald-50 text-emerald-700' :
                      selectedBooking.status === 'cancelled' ? 'bg-red-50 text-red-600' :
                      'bg-amber-50 text-amber-700'
                    }`}>
                      {selectedBooking.status === 'confirmed' ? '✓ Confirmé' : selectedBooking.status === 'cancelled' ? 'Annulé' : selectedBooking.status}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Date de réservation</p>
                    <p className="text-sm font-medium text-gray-800 mt-0.5">{new Date(selectedBooking.booking_date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 bg-gray-50 flex justify-end">
                <button
                  onClick={() => setShowBookingDetails(false)}
                  className="px-5 py-2.5 bg-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-300 transition-colors"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal annulation */}
        {showCancelModal && selectedBooking && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
              <div className="p-6 text-center">
                <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
                  <XCircle size={28} className="text-red-500" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Confirmer l'annulation</h3>
                <p className="text-sm text-gray-500">
                  Êtes-vous sûr de vouloir annuler la réservation de <span className="font-semibold text-gray-700">{selectedBooking.passenger_name}</span> ?
                </p>
              </div>
              <div className="flex gap-3 px-6 py-4 bg-gray-50">
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="flex-1 px-4 py-2.5 bg-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-300 transition-colors"
                >
                  Non, garder
                </button>
                <button
                  onClick={() => handleCancelBooking(selectedBooking.id)}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 transition-colors"
                >
                  Oui, annuler
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default CompanyDashboard;




