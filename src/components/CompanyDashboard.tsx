import { Plus, Edit, Trash2, Users, Download, Calendar, MapPin, DollarSign, TrendingUp, Bus, BarChart3, FileText, Eye } from 'lucide-react';
import apiService, { ScheduledTrip, Booking, CompanyStats } from '../services/api';
import { useCities } from '../hooks/useApi';
import AddTripModal from './AddTripModal';
import ConfirmationModal from './ConfirmationModal';
import NotificationModal from './NotificationModal';
import CompanyCharts from './CompanyCharts';
import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface LocalBooking extends Booking {
  trip_details?: Trip; // Add trip_details for local use if needed
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

  const { cities: apiCities } = useCities();

  const [stats, setStats] = useState<CompanyStats | null>(null);
  const [trips, setTrips] = useState<ScheduledTrip[]>([]);
  const [bookings, setBookings] = useState<LocalBooking[]>([]);

  const fetchCompanyData = useCallback(async () => {
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

      const fetchedTrips = await apiService.getScheduledTrips(companyId); // This should be filtered by company on backend
      setTrips(fetchedTrips);

      const fetchedBookings = await apiService.getBookings(); // This should be filtered by company on backend
      setBookings(fetchedBookings);

    } catch (e) {
      console.error('Failed to load company dashboard data', e);
      setNotificationData({
        type: 'error',
        title: 'Erreur de chargement',
        message: 'Impossible de charger les données du tableau de bord.'
      });
      setShowNotification(true);
    }
  }, [companyId]);

  useEffect(() => {
    let mounted = true;

    fetchCompanyData();

    return () => { mounted = false };
  }, [fetchCompanyData]); // Add fetchCompanyData to dependency array

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

  const handleExportTickets = () => {
    // Logic to export tickets
    setNotificationData({
      type: 'info',
      title: 'Exportation',
      message: 'Fonctionnalité d\'exportation de billets à implémenter.'
    });
    setShowNotification(true);
  };

  const handleDownloadReport = () => {
    // Logic to download report
    setNotificationData({
      type: 'info',
      title: 'Rapport',
      message: 'Fonctionnalité de téléchargement de rapport à implémenter.'
    });
    setShowNotification(true);
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
        <h1 className="text-3xl font-bold text-gray-800">Tableau de bord de la compagnie {siteTitle ? `pour ${siteTitle}` : ''} (ID: {companyId})</h1>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-4 rounded-lg shadow flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Total Trips</p>
            <p className="text-2xl font-bold">{stats?.totalTrips || 0}</p>
          </div>
          {logoUrl ? (
            <img src={logoUrl} alt={siteTitle || "Logo"} className="h-7 w-7 text-blue-500" />
          ) : (
            <Bus className="text-blue-500" size={28} />
          )}
        </div>
        <div className="bg-white p-4 rounded-lg shadow flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Total Bookings</p>
            <p className="text-2xl font-bold">{stats?.totalBookings || 0}</p>
          </div>
          <FileText className="text-green-500" size={28} />
        </div>
        <div className="bg-white p-4 rounded-lg shadow flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Total Revenue</p>
            <p className="text-2xl font-bold">{stats?.totalRevenue?.toFixed(2) || 0} €</p>
          </div>
          <DollarSign className="text-yellow-500" size={28} />
        </div>
        <div className="bg-white p-4 rounded-lg shadow flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Active Users</p>
            <p className="text-2xl font-bold">{stats?.activeUsers || 0}</p>
          </div>
          <Users className="text-red-500" size={28} />
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
              Trips ({trips.length})
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
              Bookings ({bookings.length})
            </button>
          </nav>
        </div>
      </div>

      {/* Content based on active tab */}
      {activeTab === 'trips' && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Trips</h2>
          <div className="flex justify-between mb-4">
            <button
              onClick={() => setShowAddTripModal(true)}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 flex items-center"
            >
              <Plus size={20} className="mr-2" /> Add New Trip
            </button>
            <button
              onClick={handleExportTickets}
              className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 flex items-center"
            >
              <Download size={20} className="mr-2" /> Export Tickets
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Route</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Available Seats</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {trips.map((trip) => (
                  <tr key={trip.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{trip.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{trip.trip_info?.departure_city_name || 'N/A'} to {trip.trip_info?.arrival_city_name || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(trip.date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{trip.trip_info?.departure_time || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{(trip.trip_info?.price ? `${trip.trip_info.price} FCFA` : 'N/A')}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{trip.available_seats}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button onClick={() => setEditingTrip(trip)} className="text-indigo-600 hover:text-indigo-900 mr-4"><Edit size={18} /></button>
                      <button onClick={() => { setItemToDelete({ type: 'trip', id: trip.id, name: `${trip.trip_info?.departure_city_name} to ${trip.trip_info?.arrival_city_name}` }); setShowDeleteModal(true); }} className="text-red-600 hover:text-red-900"><Trash2 size={18} /></button>
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
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Bookings</h2>
          <div className="flex justify-end mb-4">
            <button
              onClick={handleDownloadReport}
              className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 flex items-center"
            >
              <Download size={20} className="mr-2" /> Download Report
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trip</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Seats</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Booking Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {bookings.map((booking) => (
                  <tr key={booking.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{booking.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{booking.user_id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{booking.trip_details?.origin} to {booking.trip_details?.destination}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{booking.num_seats}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{booking.status}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(booking.booking_date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button onClick={() => { setItemToDelete({ type: 'booking', id: booking.id, name: `Booking ${booking.id}` }); setShowDeleteModal(true); }} className="text-red-600 hover:text-red-900"><Trash2 size={18} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals and Notifications */}
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
          message={`Are you sure you want to delete ${itemToDelete.type} ${itemToDelete.name}?`}
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
    </div>
  );
};

export default CompanyDashboard;