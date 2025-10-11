import React, { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, Users, Download, Calendar, MapPin, DollarSign, TrendingUp, Bus, BarChart3, FileText, Eye, XCircle } from 'lucide-react';
import apiService, { ScheduledTrip, Booking, CompanyStats } from '../services/api';
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

  const { cities: apiCities } = useCities();

  const [stats, setStats] = useState<CompanyStats | null>(null);
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
    fetchCompanyData();
  }, [companyId]);

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
      await apiService.updateBookingStatus(bookingId, 'cancelled');
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
    <div className="company-dashboard p-6">
      <div className="flex items-center mb-6">
        {logoUrl && (
          <img src={logoUrl} alt={siteTitle || "Logo"} className="h-10 w-10 mr-3" />
        )}
        <h1 className="text-3xl font-bold text-gray-800">
          Tableau de bord de la compagnie {siteTitle ? `pour ${siteTitle}` : ''}
        </h1>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Voyages</p>
              <p className="text-3xl font-bold text-gray-800">
                {stats?.total_trips ? formatNumber(stats.total_trips) : '0'}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Bus className="h-8 w-8 text-blue-500" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm text-gray-400">
              Voyages programmés
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Réservations</p>
              <p className="text-3xl font-bold text-gray-800">
                {stats?.total_bookings ? formatNumber(stats.total_bookings) : '0'}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <FileText className="h-8 w-8 text-green-500" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm text-gray-400">
              Total des réservations
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Revenu total</p>
              <p className="text-3xl font-bold text-gray-800">
                {stats?.total_revenue ? formatCurrency(stats.total_revenue) : '0'} FCFA
              </p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-full">
              <DollarSign className="h-8 w-8 text-yellow-500" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm text-gray-400">
              Chiffre d'affaires
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Utilisateurs actifs</p>
              <p className="text-3xl font-bold text-gray-800">
                {stats?.active_users ? formatNumber(stats.active_users) : '0'}
              </p>
            </div>
            <div className="p-3 bg-red-100 rounded-full">
              <Users className="h-8 w-8 text-red-500" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm text-gray-400">
              Clients réguliers
            </p>
          </div>
        </div>
      </div>

      {/* Tabs for Trips and Bookings */}
      <div className="mb-8">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('trips')}
              className={`
                ${activeTab === 'trips'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
              `}
            >
              Voyages ({trips.length})
            </button>
            <button
              onClick={() => setActiveTab('bookings')}
              className={`
                ${activeTab === 'bookings'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
              `}
            >
              Réservations ({bookings.length})
            </button>
          </nav>
        </div>
      </div>

      {/* Content based on active tab */}
      {activeTab === 'trips' && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Voyages</h2>
          <div className="flex justify-between mb-4">
            <button
              onClick={() => setShowAddTripModal(true)}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 flex items-center"
            >
              <Plus size={20} className="mr-2" /> Ajouter un voyage
            </button>
            <button
              onClick={handleExportTickets}
              className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 flex items-center"
            >
              <Download size={20} className="mr-2" /> Exporter les billets
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trajet</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Heure</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prix</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Places disponibles</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {trips.map((trip) => (
                  <tr key={trip.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{trip.trip_info?.departure_city_name || 'N/A'} → {trip.trip_info?.arrival_city_name || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(trip.date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{trip.trip_info?.departure_time || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{(trip.trip_info?.price ? `${trip.trip_info.price} FCFA` : 'N/A')}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{trip.available_seats}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button onClick={() => setEditingTrip(trip)} className="text-indigo-600 hover:text-indigo-900 mr-4" title="Modifier"><Edit size={18} /></button>
                      <button onClick={() => { setItemToDelete({ type: 'trip', id: trip.id, name: `${trip.trip_info?.departure_city_name} → ${trip.trip_info?.arrival_city_name}` }); setShowDeleteModal(true); }} className="text-red-600 hover:text-red-900" title="Supprimer"><Trash2 size={18} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'bookings' && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Réservations</h2>
          <div className="flex justify-end mb-4">
            <button
              onClick={handleDownloadReport}
              className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 flex items-center"
            >
              <Download size={20} className="mr-2" /> Télécharger le rapport
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Voyageur</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trajet</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Siège</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date de réservation</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {bookings.map((booking) => (
                  <tr key={booking.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{booking.passenger_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{booking.trip_details?.departure_city_name} → {booking.trip_details?.arrival_city_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{booking.seat_number}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{booking.status}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(booking.booking_date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      <button 
                        onClick={() => { 
                          setSelectedBooking(booking); 
                          setShowBookingDetails(true); 
                        }} 
                        className="text-blue-600 hover:text-blue-900 inline-block"
                        title="Voir les détails"
                      >
                        <Eye size={18} />
                      </button>
                      <button 
                        onClick={() => { 
                          setSelectedBooking(booking); 
                          setShowCancelModal(true); 
                        }} 
                        className="text-yellow-600 hover:text-yellow-900 inline-block"
                        title="Annuler la réservation"
                      >
                        <XCircle size={18} />
                      </button>
                      <button 
                        onClick={() => { 
                          setItemToDelete({ 
                            type: 'booking', 
                            id: booking.id, 
                            name: `Réservation de ${booking.passenger_name}` 
                          }); 
                          setShowDeleteModal(true); 
                        }} 
                        className="text-red-600 hover:text-red-900 inline-block"
                        title="Supprimer"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      {showAddTripModal && (
        <AddTripModal
          isOpen={showAddTripModal}
          onClose={() => setShowAddTripModal(false)}
          onSave={handleSaveTrip}
          editingTrip={editingTrip}
          companyId={companyId}
          cities={apiCities}
        />
      )}

      {showDeleteModal && itemToDelete && (
        <ConfirmationModal
          message={`Are you sure you want to delete ${itemToDelete.name} ?`}
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

      {/* Modal pour les détails de la réservation */}
      {showBookingDetails && selectedBooking && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Détails de la réservation</h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500 mb-2">
                  <strong>Voyageur:</strong> {selectedBooking.passenger_name}
                </p>
                <p className="text-sm text-gray-500 mb-2">
                  <strong>Email:</strong> {selectedBooking.passenger_email}
                </p>
                <p className="text-sm text-gray-500 mb-2">
                  <strong>Téléphone:</strong> {selectedBooking.passenger_phone}
                </p>
                <p className="text-sm text-gray-500 mb-2">
                  <strong>Trajet:</strong> {selectedBooking.trip_details?.departure_city_name} → {selectedBooking.trip_details?.arrival_city_name}
                </p>
                <p className="text-sm text-gray-500 mb-2">
                  <strong>Siège:</strong> {selectedBooking.seat_number}
                </p>
                <p className="text-sm text-gray-500 mb-2">
                  <strong>Statut:</strong> {selectedBooking.status}
                </p>
                <p className="text-sm text-gray-500 mb-2">
                  <strong>Date de réservation:</strong> {new Date(selectedBooking.booking_date).toLocaleDateString()}
                </p>
              </div>
              <div className="items-center px-4 py-3">
                <button
                  onClick={() => setShowBookingDetails(false)}
                  className="px-4 py-2 bg-gray-500 text-white text-base font-medium rounded-md shadow-sm hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-300"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmation d'annulation */}
      {showCancelModal && selectedBooking && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Confirmer l'annulation</h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  Êtes-vous sûr de vouloir annuler la réservation de {selectedBooking.passenger_name} ?
                </p>
              </div>
              <div className="items-center px-4 py-3">
                <button
                  onClick={() => handleCancelBooking(selectedBooking.id)}
                  className="px-4 py-2 bg-red-500 text-white text-base font-medium rounded-md shadow-sm hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-300 mr-2"
                >
                  Confirmer
                </button>
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="px-4 py-2 bg-gray-500 text-white text-base font-medium rounded-md shadow-sm hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-300"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyDashboard;