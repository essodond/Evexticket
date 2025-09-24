import React, { useEffect, useState } from 'react';
import apiService from '../services/api';
import { Users, Building, DollarSign, Plus, Edit, Trash2, Eye, Download, Filter, Bus, FileText, BarChart3 } from 'lucide-react';
import AddCompanyModal from './AddCompanyModal';
import AddTripModal from './AddTripModal';
import ExportTicketsModal from './ExportTicketsModal';
import AdminCharts from './AdminCharts';

interface Company {
  id: string;
  name: string;
  description: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  logo: string;
  isActive: boolean;
  createdAt: string;
}

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

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: 'user' | 'company' | 'admin';
  isActive: boolean;
  createdAt: string;
}

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [showAddCompanyModal, setShowAddCompanyModal] = useState(false);
  const [showAddTripModal, setShowAddTripModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);

  // State pour données réelles
  const [stats, setStats] = useState<{
    totalUsers: number;
    totalCompanies: number;
    totalTrips: number;
    totalBookings: number;
    totalRevenue: number;
    monthlyGrowth: number;
  } | null>(null);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const [statsData, companiesData, tripsData] = await Promise.all([
          apiService.getDashboardStats(),
          apiService.getCompanies(),
          apiService.getTrips(),
        ]);

        if (!mounted) return;

        setStats(statsData as any);
        // Adapter les données pour les types locaux si nécessaire
        setCompanies((companiesData as any[]).map(c => ({
          id: String(c.id),
          name: c.name,
          description: c.description || '',
          address: c.address || '',
          phone: c.phone || '',
          email: c.email || '',
          website: c.website || '',
          logo: c.logo || '',
          isActive: c.is_active,
          createdAt: c.created_at,
        })));

        setTrips((tripsData as any[]).map(t => ({
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

        // Users: l'API n'a pas d'endpoint users explicite; on peut réutiliser totalUsers pour le chiffre
        setUsers([]);
      } catch (err: any) {
        console.error('Failed loading admin data', err);
        // Si erreur 403 -> accès non autorisé
        if (err && err.status === 403) {
          setError('Accès non autorisé. Veuillez vous connecter avec un compte administrateur.');
        } else {
          setError(err.message || 'Erreur lors du chargement des données');
        }
      } finally {
        setLoading(false);
      }
    }

    loadData();

    return () => { mounted = false };
  }, []);

  const handleAddCompany = (companyData: Omit<Company, 'id' | 'createdAt'>) => {
    // Appel API pour créer la compagnie
    (async () => {
      try {
        const payload: any = {
          name: companyData.name,
          description: companyData.description,
          address: companyData.address,
          phone: companyData.phone,
          email: companyData.email,
          website: companyData.website,
          logo: companyData.logo,
          is_active: companyData.isActive,
        };
        // Forward optional admin credentials if present
        if ((companyData as any).admin_email) payload.admin_email = (companyData as any).admin_email;
        if ((companyData as any).admin_password) payload.admin_password = (companyData as any).admin_password;

        const created = await apiService.createCompany(payload as any);
        setCompanies(prev => [{
          id: String(created.id),
          name: created.name,
          description: created.description || '',
          address: created.address || '',
          phone: created.phone || '',
          email: created.email || '',
          website: created.website || '',
          logo: created.logo || '',
          isActive: created.is_active,
          createdAt: created.created_at,
        }, ...prev]);
      } catch (err) {
        console.error('Erreur création compagnie', err);
        // Try to display server validation errors if available
        if (err && typeof err === 'object' && (err as any).response && (err as any).response.data) {
          const data = (err as any).response.data;
          const messages = Object.entries(data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join('\n');
          alert(`Erreur lors de la création de la compagnie:\n${messages}`);
        } else {
          alert('Erreur lors de la création de la compagnie');
        }
      }
    })();
  };

  const handleEditCompany = (company: Company) => {
    setEditingCompany(company);
    setShowAddCompanyModal(true);
  };

  const handleAddTrip = (tripData: Omit<Trip, 'id' | 'companyName'>) => {
    (async () => {
      try {
        const created = await apiService.createTrip({
          company: Number(tripData.companyId),
          departure_city: tripData.departureCity,
          arrival_city: tripData.arrivalCity,
          departure_time: tripData.departureTime,
          arrival_time: tripData.arrivalTime,
          price: tripData.price,
          duration: tripData.duration,
          bus_type: tripData.busType,
          capacity: tripData.capacity,
          is_active: tripData.isActive,
        } as any);
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
      } catch (err) {
        console.error('Erreur création trajet', err);
        alert('Erreur lors de la création du trajet');
      }
    })();
  };

  const handleEditTrip = (trip: Trip) => {
    setEditingTrip(trip);
    setShowAddTripModal(true);
  };

  const handleExportTickets = (format: 'pdf' | 'excel', filters: any) => {
    console.log('Exporting tickets:', format, filters);
    // Ici on ferait l'export des tickets
  };

  const tabs = [
    { id: 'overview', label: 'Vue d\'ensemble', icon: BarChart3 },
    { id: 'companies', label: 'Compagnies', icon: Building },
    { id: 'trips', label: 'Trajets', icon: Bus },
    { id: 'users', label: 'Utilisateurs', icon: Users },
    { id: 'reports', label: 'Rapports', icon: FileText }
  ];

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Utilisateurs</p>
              <p className="text-3xl font-bold text-gray-900">{(stats?.totalUsers ?? 0).toLocaleString()}</p>
            </div>
            <Users className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Compagnies</p>
              <p className="text-3xl font-bold text-gray-900">{stats?.totalCompanies ?? 0}</p>
            </div>
            <Building className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Trajets</p>
              <p className="text-3xl font-bold text-gray-900">{stats?.totalTrips ?? 0}</p>
            </div>
            <Bus className="w-8 h-8 text-purple-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Réservations</p>
              <p className="text-3xl font-bold text-gray-900">{(stats?.totalBookings ?? 0).toLocaleString()}</p>
            </div>
            <FileText className="w-8 h-8 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Revenue Card */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 rounded-xl text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-100">Revenus totaux</p>
            <p className="text-3xl font-bold">{(stats?.totalRevenue ?? 0).toLocaleString()} FCFA</p>
            <p className="text-blue-100 text-sm">+{stats?.monthlyGrowth ?? 0}% ce mois</p>
          </div>
          <DollarSign className="w-12 h-12 text-blue-200" />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => setShowAddCompanyModal(true)}
          className="p-4 bg-white border border-gray-200 rounded-xl hover:shadow-md transition-shadow text-left"
        >
          <Plus className="w-6 h-6 text-blue-600 mb-2" />
          <h3 className="font-semibold text-gray-900">Ajouter une compagnie</h3>
          <p className="text-sm text-gray-600">Enregistrer une nouvelle compagnie de transport</p>
        </button>

        <button
          onClick={() => setShowAddTripModal(true)}
          className="p-4 bg-white border border-gray-200 rounded-xl hover:shadow-md transition-shadow text-left"
        >
          <Bus className="w-6 h-6 text-green-600 mb-2" />
          <h3 className="font-semibold text-gray-900">Créer un trajet</h3>
          <p className="text-sm text-gray-600">Ajouter un nouveau trajet de transport</p>
        </button>

        <button
          onClick={() => setShowExportModal(true)}
          className="p-4 bg-white border border-gray-200 rounded-xl hover:shadow-md transition-shadow text-left"
        >
          <Download className="w-6 h-6 text-purple-600 mb-2" />
          <h3 className="font-semibold text-gray-900">Exporter les tickets</h3>
          <p className="text-sm text-gray-600">Générer des rapports de tickets</p>
        </button>
      </div>

  {/* Graphiques d'analyse */}
  <AdminCharts stats={stats} companies={companies} trips={trips} />
    </div>
  );

  const renderCompanies = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Gestion des compagnies</h2>
        <button
          onClick={() => setShowAddCompanyModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Ajouter une compagnie
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Compagnie
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date d'ajout
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {companies.map((company) => (
                <tr key={company.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <Building className="h-6 w-6 text-blue-600" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{company.name}</div>
                        <div className="text-sm text-gray-500">{company.description}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{company.email}</div>
                    <div className="text-sm text-gray-500">{company.phone}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      company.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {company.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(company.createdAt).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEditCompany(company)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="text-red-600 hover:text-red-900">
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

  const renderTrips = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Gestion des trajets</h2>
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
                  Compagnie
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
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {trips.map((trip) => (
                <tr key={trip.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {trip.departureCity} → {trip.arrivalCity}
                    </div>
                    <div className="text-sm text-gray-500">{trip.duration}h de trajet</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {trip.companyName}
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEditTrip(trip)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="text-red-600 hover:text-red-900">
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

  const renderUsers = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Gestion des utilisateurs</h2>
        <div className="flex space-x-2">
          <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center">
            <Filter className="w-4 h-4 mr-2" />
            Filtrer
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center">
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
                  Utilisateur
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rôle
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Inscription
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                          <Users className="h-6 w-6 text-gray-600" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {user.firstName} {user.lastName}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{user.email}</div>
                    <div className="text-sm text-gray-500">{user.phone}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.role === 'admin' ? 'bg-red-100 text-red-800' :
                      user.role === 'company' ? 'bg-blue-100 text-blue-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {user.role === 'admin' ? 'Admin' :
                       user.role === 'company' ? 'Compagnie' : 'Utilisateur'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {user.isActive ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(user.createdAt).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button className="text-blue-600 hover:text-blue-900">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="text-green-600 hover:text-green-900">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="text-red-600 hover:text-red-900">
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
      <h2 className="text-2xl font-bold text-gray-900">Rapports et exports</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <button
          onClick={() => setShowExportModal(true)}
          className="p-6 bg-white border border-gray-200 rounded-xl hover:shadow-md transition-shadow text-left"
        >
          <FileText className="w-8 h-8 text-blue-600 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Export des tickets</h3>
          <p className="text-sm text-gray-600">Générer des rapports de tickets en PDF ou Excel</p>
        </button>

        <button className="p-6 bg-white border border-gray-200 rounded-xl hover:shadow-md transition-shadow text-left">
          <BarChart3 className="w-8 h-8 text-green-600 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Rapport financier</h3>
          <p className="text-sm text-gray-600">Analyser les revenus et performances</p>
        </button>

        <button className="p-6 bg-white border border-gray-200 rounded-xl hover:shadow-md transition-shadow text-left">
          <Users className="w-8 h-8 text-purple-600 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Rapport utilisateurs</h3>
          <p className="text-sm text-gray-600">Statistiques d'utilisation et engagement</p>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Administration TogoTrans</h1>
              <p className="text-gray-600">Gérez votre plateforme de transport</p>
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
        {activeTab === 'overview' && (loading ? (
          <div className="p-6 text-center">Chargement...</div>
        ) : error ? (
          <div className="p-6 text-center text-red-600">
            <div>{error}</div>
            {error.includes('connecter') && (
              <div className="mt-4">
                <a href="/login" className="text-blue-600 underline">Aller à la connexion</a>
              </div>
            )}
          </div>
        ) : (
          renderOverview()
        ))}
        {activeTab === 'companies' && renderCompanies()}
        {activeTab === 'trips' && renderTrips()}
        {activeTab === 'users' && renderUsers()}
        {activeTab === 'reports' && renderReports()}
      </div>

      {/* Modals */}
      <AddCompanyModal
        isOpen={showAddCompanyModal}
        onClose={() => {
          setShowAddCompanyModal(false);
          setEditingCompany(null);
        }}
        onSave={handleAddCompany}
        editingCompany={editingCompany}
      />

      <AddTripModal
        isOpen={showAddTripModal}
        onClose={() => {
          setShowAddTripModal(false);
          setEditingTrip(null);
        }}
        onSave={handleAddTrip}
        editingTrip={editingTrip}
        companies={companies}
      />

      <ExportTicketsModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExport={handleExportTickets}
      />
    </div>
  );
};

export default AdminDashboard;