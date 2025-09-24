import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Users, Download, Calendar, MapPin, DollarSign, TrendingUp, Bus, BarChart3, FileText, Eye } from 'lucide-react';
import apiService from '../services/api';
import { useCities } from '../hooks/useApi';
import AddTripModal from './AddTripModal';
import ConfirmationModal from './ConfirmationModal';
import NotificationModal from './NotificationModal';
import CompanyCharts from './CompanyCharts';

interface Trip {
  id: string;
  companyId: string;
  companyName: string;
  departureCity: string;
  arrivalCity: string;
  departureTime: string;
  arrivalTime: string;
  price: number;
  duration: number;
  busType: string;
  capacity: number;
  isActive: boolean;
}

interface Booking {
  id: string;
  tripId: string;
  passengerName: string;
  passengerEmail: string;
  passengerPhone: string;
  seatNumber: string;
  status: 'confirmed' | 'pending' | 'cancelled';
  bookingDate: string;
  totalPrice: number;
}

const CompanyDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('trips');
  const [showAddTripModal, setShowAddTripModal] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationData, setNotificationData] = useState({
    type: 'success' as 'success' | 'error' | 'warning' | 'info',
    title: '',
    message: ''
  });
  const [itemToDelete, setItemToDelete] = useState<{ type: 'trip' | 'booking', id: string, name: string } | null>(null);

  const { cities: apiCities } = useCities();

  // Mock data
  const stats = {
    totalTrips: 24,
    totalBookings: 156,
    totalRevenue: 780000,
    monthlyGrowth: 12.5,
    activeTrips: 18,
    pendingBookings: 8
  };

  const [trips, setTrips] = useState<Trip[]>([]);

  useEffect(() => {
    let mounted = true;
    const fetchTrips = async () => {
      try {
        const data = await apiService.getTrips();
        if (!mounted) return;
        setTrips((data as any[]).map(t => ({
          id: String(t.id),
          companyId: String(t.company),
          companyName: t.company_name || '',
          departureCity: t.departure_city_name || String(t.departure_city),
          arrivalCity: t.arrival_city_name || String(t.arrival_city),
          departureTime: t.departure_time,
          arrivalTime: t.arrival_time,
          price: t.price,
          duration: t.duration,
          busType: t.bus_type,
          capacity: t.capacity,
          isActive: t.is_active,
        })));
      } catch (e) {
        console.error('Failed to load trips for company dashboard', e);
      }
    };
    fetchTrips();
    return () => { mounted = false };
  }, []);

  const bookings: Booking[] = [
    {
      id: '1',
      tripId: '1',
      passengerName: 'Jean Doe',
      passengerEmail: 'jean.doe@email.com',
      passengerPhone: '+228 90 12 34 56',
      seatNumber: 'A12',
      status: 'confirmed',
      bookingDate: '2024-01-15',
      totalPrice: 5000
    },
    {
      id: '2',
      tripId: '1',
      passengerName: 'Marie Smith',
      passengerEmail: 'marie.smith@email.com',
      passengerPhone: '+228 91 23 45 67',
      seatNumber: 'B05',
      status: 'pending',
      bookingDate: '2024-01-16',
      totalPrice: 5000
    },
    {
      id: '3',
      tripId: '2',
      passengerName: 'Paul Johnson',
      passengerEmail: 'paul.johnson@email.com',
      passengerPhone: '+228 92 34 56 78',
      seatNumber: 'C08',
      status: 'confirmed',
      bookingDate: '2024-01-17',
      totalPrice: 5000
    }
  ];

  const handleAddTrip = async (tripData: Omit<Trip, 'id' | 'companyName'>) => {
    try {
      const payload: any = {
        company: Number(tripData.companyId),
        departure_city: Number(tripData.departureCity),
        arrival_city: Number(tripData.arrivalCity),
        departure_time: tripData.departureTime,
        arrival_time: tripData.arrivalTime,
        price: tripData.price,
        duration: tripData.duration,
        bus_type: tripData.busType,
        capacity: tripData.capacity,
        is_active: tripData.isActive,
      };

      const created = await apiService.createTrip(payload as any);
      setTrips(prev => [{
        id: String(created.id),
        companyId: String(created.company),
        companyName: created.company_name || '',
        departureCity: created.departure_city_name || String(created.departure_city),
        arrivalCity: created.arrival_city_name || String(created.arrival_city),
        departureTime: created.departure_time,
        arrivalTime: created.arrival_time,
        price: created.price,
        duration: created.duration,
        busType: created.bus_type,
        capacity: created.capacity,
        isActive: created.is_active,
      }, ...prev]);

      setShowNotification(true);
      setNotificationData({ type: 'success', title: 'Trajet créé', message: 'Le trajet a été créé avec succès.' });
    } catch (e) {
      console.error('Error creating trip', e);
      setShowNotification(true);
      setNotificationData({ type: 'error', title: 'Erreur', message: 'Impossible de créer le trajet.' });
    }
  };

  const handleEditTrip = (trip: Trip) => {
    setEditingTrip(trip);
    setShowAddTripModal(true);
  };

  const handleDeleteTrip = (trip: Trip) => {
    setItemToDelete({
      type: 'trip',
      id: trip.id,
      name: `${trip.departureCity} → ${trip.arrivalCity}`
    });
    setShowDeleteModal(true);
  };

  const handleDeleteBooking = (booking: Booking) => {
    setItemToDelete({
      type: 'booking',
      id: booking.id,
      name: `${booking.passengerName} - ${booking.seatNumber}`
    });
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (itemToDelete) {
      console.log(`Deleting ${itemToDelete.type}:`, itemToDelete.id);
      setShowNotification(true);
      setNotificationData({
        type: 'success',
        title: 'Suppression réussie',
        message: `${itemToDelete.type === 'trip' ? 'Le trajet' : 'La réservation'} a été supprimé(e) avec succès.`
      });
    }
    setShowDeleteModal(false);
    setItemToDelete(null);
  };

  const tabs = [
    { id: 'overview', label: 'Vue d\'ensemble', icon: BarChart3 },
    { id: 'trips', label: 'Mes trajets', icon: Bus },
    { id: 'bookings', label: 'Réservations', icon: Users },
    { id: 'reports', label: 'Rapports', icon: FileText }
  ];

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Trajets actifs</p>
              <p className="text-3xl font-bold text-gray-900">{stats.activeTrips}</p>
            </div>
            <Bus className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Réservations</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalBookings}</p>
            </div>
            <Users className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">En attente</p>
              <p className="text-3xl font-bold text-gray-900">{stats.pendingBookings}</p>
            </div>
            <Calendar className="w-8 h-8 text-yellow-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Revenus</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalRevenue.toLocaleString()} FCFA</p>
            </div>
            <DollarSign className="w-8 h-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Revenue Card */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 rounded-xl text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-100">Revenus ce mois</p>
            <p className="text-3xl font-bold">{stats.totalRevenue.toLocaleString()} FCFA</p>
            <p className="text-blue-100 text-sm">+{stats.monthlyGrowth}% par rapport au mois dernier</p>
          </div>
          <TrendingUp className="w-12 h-12 text-blue-200" />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={() => setShowAddTripModal(true)}
          className="p-4 bg-white border border-gray-200 rounded-xl hover:shadow-md transition-shadow text-left"
        >
          <Plus className="w-6 h-6 text-blue-600 mb-2" />
          <h3 className="font-semibold text-gray-900">Créer un trajet</h3>
          <p className="text-sm text-gray-600">Ajouter un nouveau trajet à votre offre</p>
        </button>

        <button className="p-4 bg-white border border-gray-200 rounded-xl hover:shadow-md transition-shadow text-left">
          <Download className="w-6 h-6 text-green-600 mb-2" />
          <h3 className="font-semibold text-gray-900">Exporter les données</h3>
          <p className="text-sm text-gray-600">Télécharger vos rapports et statistiques</p>
        </button>
      </div>

      {/* Graphiques d'analyse */}
      <CompanyCharts />
    </div>
  );

  const renderTrips = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Mes trajets</h2>
        <button
          onClick={() => setShowAddTripModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Ajouter un trajet
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trajet
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Horaires
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Prix
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {trips.map((trip) => (
                <tr key={trip.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 text-gray-400 mr-2" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {trip.departureCity} → {trip.arrivalCity}
                        </div>
                        <div className="text-sm text-gray-500">{trip.duration}h de trajet</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>{trip.departureTime} - {trip.arrivalTime}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {trip.price.toLocaleString()} FCFA
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      {trip.busType}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      trip.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {trip.isActive ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEditTrip(trip)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteTrip(trip)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderBookings = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Réservations</h2>
        <div className="flex space-x-2">
          <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center">
            <Download className="w-4 h-4 mr-2" />
            Exporter
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Passager
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trajet
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Siège
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Prix
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {bookings.map((booking) => (
                <tr key={booking.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{booking.passengerName}</div>
                      <div className="text-sm text-gray-500">{booking.passengerEmail}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {trips.find(t => t.id === booking.tripId)?.departureCity} → {trips.find(t => t.id === booking.tripId)?.arrivalCity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {booking.seatNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {booking.totalPrice.toLocaleString()} FCFA
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                      booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {booking.status === 'confirmed' ? 'Confirmé' :
                       booking.status === 'pending' ? 'En attente' : 'Annulé'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(booking.bookingDate).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button className="text-blue-600 hover:text-blue-900">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteBooking(booking)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderReports = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Rapports et statistiques</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <button className="p-6 bg-white border border-gray-200 rounded-xl hover:shadow-md transition-shadow text-left">
          <FileText className="w-8 h-8 text-blue-600 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Rapport des réservations</h3>
          <p className="text-sm text-gray-600">Analysez vos réservations par période</p>
        </button>

        <button className="p-6 bg-white border border-gray-200 rounded-xl hover:shadow-md transition-shadow text-left">
          <BarChart3 className="w-8 h-8 text-green-600 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Rapport financier</h3>
          <p className="text-sm text-gray-600">Suivez vos revenus et performances</p>
        </button>

        <button className="p-6 bg-white border border-gray-200 rounded-xl hover:shadow-md transition-shadow text-left">
          <Bus className="w-8 h-8 text-purple-600 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Rapport des trajets</h3>
          <p className="text-sm text-gray-600">Analysez la performance de vos trajets</p>
        </button>
      </div>

      {/* Graphiques détaillés */}
      <CompanyCharts />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard Compagnie</h1>
              <p className="text-gray-600">Gérez vos trajets et réservations</p>
            </div>
            <div className="flex items-center space-x-4">
              <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                <Download className="w-4 h-4 mr-2" />
                Exporter
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'trips' && renderTrips()}
        {activeTab === 'bookings' && renderBookings()}
        {activeTab === 'reports' && renderReports()}
      </div>

      {/* Modals */}
      <AddTripModal
        isOpen={showAddTripModal}
        onClose={() => {
          setShowAddTripModal(false);
          setEditingTrip(null);
        }}
        onSave={handleAddTrip as any}
        editingTrip={editingTrip}
        companies={[{ id: '1', name: 'TogoBus Express', isActive: true }]}
        cities={apiCities}
      />

      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setItemToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Confirmer la suppression"
        message={`Êtes-vous sûr de vouloir supprimer ${itemToDelete?.name} ? Cette action est irréversible.`}
        confirmText="Supprimer"
        cancelText="Annuler"
        type="danger"
      />

      <NotificationModal
        isOpen={showNotification}
        onClose={() => setShowNotification(false)}
        type={notificationData.type}
        title={notificationData.title}
        message={notificationData.message}
      />
    </div>
  );
};

export default CompanyDashboard;