import React, { useEffect, useState, useMemo, useCallback } from 'react';
import apiService, { City } from '../services/api';
import { Company as TCompany, Trip as TTrip, User as TUser } from '../types';
import { useCities } from '../hooks/useApi';
import { Edit, Trash2, Users, Download, Bus, BarChart3, FileText, Eye, Building, Lock, TrendingUp, DollarSign, Calendar, RefreshCw, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import AddCompanyModal from './AddCompanyModal';
import AddTripModal from './AddTripModal';
import ExportTicketsModal from './ExportTicketsModal';
import AdminCharts from './AdminCharts';
import NotificationModal from './NotificationModal';
import UserDetailsModal from './UserDetailsModal';

type Company = TCompany;
type Trip = TTrip;
type User = TUser;

interface AdminDashboardProps {
  logoUrl?: string;
  siteTitle?: string;
}

const AdminDashboard: React.FC<AdminDashboardProps> = (_props) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [showAddCompanyModal, setShowAddCompanyModal] = useState(false);
  const [showAddTripModal, setShowAddTripModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);

  const [stats, setStats] = useState<any>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);

  const n1Cities = useMemo(() => ["Lomé", "Tsévié", "Aného", "Atakpamé", "Sokodé", "Kara", "Dapaong", "Mango"], []);
  const filterN1Cities = useCallback((city: City) => n1Cities.includes(city.name), [n1Cities]);
  const { cities: apiCities } = useCities();
  const n1ApiCities = useMemo(() => (apiCities || []).filter(filterN1Cities), [apiCities, filterN1Cities]);

  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const [showUserDetails, setShowUserDetails] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userToConfirmDelete, setUserToConfirmDelete] = useState<User | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | number | null>(null);

  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null);
  const [tripToDelete, setTripToDelete] = useState<Trip | null>(null);

  const [showNotification, setShowNotification] = useState(false);
  const [notificationData, setNotificationData] = useState<any>({ type: 'success', title: '', message: '' });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // load initial data
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const [s, comps, tps] = await Promise.all([
          apiService.getDashboardStats(),
          apiService.getCompanies(),
          apiService.getScheduledTrips(),
        ]);
        if (!mounted) return;
        setStats(s || {});
        setCompanies(((comps as any[]) || []).map(c => ({ id: String(c.id), name: c.name, description: c.description || '', address: c.address || '', phone: c.phone || '', email: c.email || '', website: c.website || '', logo: c.logo || '', isActive: c.is_active, createdAt: c.created_at })));
        setTrips(((tps as any[]) || []).map(t => ({ id: String(t.id), companyId: String(t.company), companyName: t.company_name || '', departureCity: t.departure_city_name || String(t.departure_city), arrivalCity: t.arrival_city_name || String(t.arrival_city), departureTime: t.departure_time, arrivalTime: t.arrival_time, price: t.price, duration: t.duration, busType: t.bus_type, capacity: t.capacity, isActive: t.is_active })));
        // Charger les utilisateurs
        let usersData: any[] = [];
        try { usersData = await apiService.getUsers(); } catch (e) { console.warn('Impossible de charger les utilisateurs:', e); usersData = []; }
        if (!mounted) return;
        setUsers((usersData || []).map(u => ({ id: String(u.id), firstName: u.first_name || u.firstName || '', lastName: u.last_name || u.lastName || '', email: u.email || '', phone_number: u.phone_number || '', role: u.is_staff ? 'admin' : (u.is_company_admin ? 'company' : 'user'), isActive: u.is_active ?? true, createdAt: u.date_joined || u.created_at || '' })));
      } catch (e: any) { console.error(e); if (mounted) setError(e?.message || 'Erreur de chargement'); }
      finally { if (mounted) setLoading(false); }
    };
    load();
    return () => { mounted = false };
  }, []);

  // --- Handlers compagnies ---
  const handleAddCompany = async (payload: any) => {
    try {
      if (payload.id) {
        const updated = await apiService.updateCompany(Number(payload.id), payload);
        setCompanies(prev => prev.map(c => c.id === String(updated.id) ? ({ ...c, name: updated.name, email: updated.email || c.email, phone: updated.phone || c.phone }) : c));
        setNotificationData({ type: 'success', title: 'Modifié', message: 'La compagnie a été modifiée.' });
      } else {
        const created = await apiService.createCompany(payload);
        setCompanies(prev => [{ id: String(created.id), name: created.name, description: created.description || '', address: created.address || '', phone: created.phone || '', email: created.email || '', website: created.website || '', logo: created.logo || '', isActive: created.is_active, createdAt: created.created_at }, ...prev]);
        setNotificationData({ type: 'success', title: 'Créée', message: 'La compagnie a été créée.' });
      }
    } catch (e: any) { setNotificationData({ type: 'error', title: 'Erreur', message: e?.message || 'Erreur' }); }
    setShowNotification(true); setShowAddCompanyModal(false); setEditingCompany(null);
  };
  const handleEditCompany = (c: Company) => { setEditingCompany(c); setShowAddCompanyModal(true); };
  const confirmDeleteCompany = async () => {
    if (!companyToDelete) return;
    const id = companyToDelete.id;
    const prev = companies.slice();
    setCompanies(p => p.filter(x => x.id !== id));
    try { await apiService.deleteCompany(Number(id)); setNotificationData({ type: 'success', title: 'Supprimée', message: 'Compagnie supprimée.' }); }
    catch (e: any) { setCompanies(prev); setNotificationData({ type: 'error', title: 'Erreur', message: e?.message || 'Impossible de supprimer.' }); }
    setShowNotification(true); setCompanyToDelete(null);
  };

  // --- Handlers trajets ---
  const handleAddTrip = async (payload: any) => {
    try {
      if (editingTrip) {
        const updated = await apiService.updateTrip(Number(editingTrip.id), payload);
        setTrips(prev => prev.map(t => t.id === String(updated.id) ? ({ ...t, companyName: updated.company_name || t.companyName }) : t));
        setNotificationData({ type: 'success', title: 'Modifié', message: 'Trajet modifié.' });
      } else {
        const created = await apiService.createTrip(payload);
        setTrips(prev => [{ id: String(created.id), companyId: String(created.company), companyName: created.company_name || '', departureCity: created.departure_city_name || '', arrivalCity: created.arrival_city_name || '', departureTime: created.departure_time, arrivalTime: created.arrival_time, price: created.price, duration: created.duration, busType: created.bus_type, capacity: created.capacity, isActive: created.is_active }, ...prev]);
        setNotificationData({ type: 'success', title: 'Créé', message: 'Trajet créé.' });
      }
    } catch (e: any) { setNotificationData({ type: 'error', title: 'Erreur', message: e?.message || 'Erreur' }); }
    setShowNotification(true); setShowAddTripModal(false); setEditingTrip(null);
  };
  const handleEditTrip = (t: Trip) => { setEditingTrip(t); setShowAddTripModal(true); };
  const confirmDeleteTrip = async () => {
    if (!tripToDelete) return;
    try { await apiService.deleteTrip(Number(tripToDelete.id)); setTrips(prev => prev.filter(x => x.id !== tripToDelete.id)); setNotificationData({ type: 'success', title: 'Supprimé', message: 'Trajet supprimé.' }); }
    catch (e: any) { setNotificationData({ type: 'error', title: 'Erreur', message: e?.message || 'Erreur' }); }
    setShowNotification(true); setTripToDelete(null);
  };

  // --- Handlers utilisateurs ---
  const handleViewUser = (u: User) => { setSelectedUser(u); setShowUserDetails(true); };
  const handleEditUser = (u: User) => { setSelectedUser(u); setShowUserDetails(true); };
  const handleSaveUserDetails = async (payload: any) => {
    try {
      const resp = await apiService.updateUser(Number(payload.id), { first_name: payload.firstName, last_name: payload.lastName, email: payload.email, phone_number: payload.phone_number, is_active: payload.isActive });
      setUsers(prev => prev.map(u => u.id === String(resp.id) ? ({ ...u, firstName: resp.first_name, lastName: resp.last_name, email: resp.email, phone_number: resp.phone_number, isActive: resp.is_active }) : u));
      setNotificationData({ type: 'success', title: 'Enregistré', message: 'Utilisateur mis à jour.' }); setShowNotification(true); setShowUserDetails(false); setSelectedUser(null);
    } catch (e: any) { setNotificationData({ type: 'error', title: 'Erreur', message: e?.message || 'Erreur' }); setShowNotification(true); }
  };
  const handleToggleUserActive = async (u: User) => {
    try { const updated = await apiService.updateUser(Number(u.id), { is_active: !u.isActive }); setUsers(prev => prev.map(p => p.id === String(updated.id) ? ({ ...p, isActive: updated.is_active ?? p.isActive }) : p)); setNotificationData({ type: 'success', title: 'Statut changé', message: `Utilisateur ${updated.is_active ? 'activé' : 'désactivé'}` }); setShowNotification(true); } catch (e: any) { setNotificationData({ type: 'error', title: 'Erreur', message: e?.message || 'Erreur' }); setShowNotification(true); }
  };
  const handleDeleteUser = (u: User) => { setUserToConfirmDelete(u); };
  const confirmDeleteUser = async () => {
    if (!userToConfirmDelete) return;
    const u = userToConfirmDelete;
    const prev = users.slice();
    setUsers(s => s.filter(x => x.id !== u.id));
    setUserToConfirmDelete(null);
    try { await apiService.deleteUser(Number(u.id)); setNotificationData({ type: 'success', title: 'Supprimé', message: 'Utilisateur supprimé.' }); }
    catch (e: any) { setUsers(prev); setNotificationData({ type: 'error', title: 'Erreur', message: e?.message || 'Impossible de supprimer' }); }
    setShowNotification(true);
  };

  // tabs
  const tabs = [
    { id: 'overview', label: "Vue d'ensemble", icon: BarChart3 },
    { id: 'companies', label: 'Compagnies', icon: Building },
    { id: 'trips', label: 'Trajets', icon: Bus },
    { id: 'users', label: 'Utilisateurs', icon: Users },
    { id: 'reports', label: 'Rapports', icon: FileText },
  ];

  useEffect(() => { try { const params = new URLSearchParams(window.location.search); const t = params.get('tab'); if (t) setActiveTab(t); else { const saved = localStorage.getItem('admin_active_tab'); if (saved) setActiveTab(saved); } } catch (e) {} }, []);
  useEffect(() => { try { const params = new URLSearchParams(window.location.search); if (activeTab) params.set('tab', activeTab); else params.delete('tab'); const newUrl = window.location.pathname + (Array.from(params.keys()).length ? `?${params.toString()}` : ''); window.history.replaceState(null, '', newUrl); localStorage.setItem('admin_active_tab', activeTab); } catch (e) {} }, [activeTab]);

  // ============ RENDERERS ============

  const renderOverview = () => {
    const statCards = [
      { label: 'Utilisateurs', value: stats?.total_users ?? users.length, icon: Users, color: 'blue', bg: 'bg-blue-50', iconBg: 'bg-blue-100', textColor: 'text-blue-700' },
      { label: 'Compagnies', value: stats?.active_companies ?? companies.length, icon: Building, color: 'emerald', bg: 'bg-emerald-50', iconBg: 'bg-emerald-100', textColor: 'text-emerald-700' },
      { label: 'Trajets actifs', value: stats?.active_trips ?? trips.length, icon: Bus, color: 'violet', bg: 'bg-violet-50', iconBg: 'bg-violet-100', textColor: 'text-violet-700' },
      { label: 'Réservations', value: stats?.total_bookings ?? 0, icon: Calendar, color: 'amber', bg: 'bg-amber-50', iconBg: 'bg-amber-100', textColor: 'text-amber-700' },
      { label: 'Revenus total', value: `${Number(stats?.total_revenue ?? 0).toLocaleString('fr-FR')} FCFA`, icon: DollarSign, color: 'green', bg: 'bg-green-50', iconBg: 'bg-green-100', textColor: 'text-green-700' },
      { label: 'Revenus (semaine)', value: `${Number(stats?.revenue_this_week ?? 0).toLocaleString('fr-FR')} FCFA`, icon: TrendingUp, color: 'cyan', bg: 'bg-cyan-50', iconBg: 'bg-cyan-100', textColor: 'text-cyan-700' },
    ];

    return (
      <div className="space-y-8">
        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {statCards.map((card, i) => {
            const Icon = card.icon;
            return (
              <div key={i} className={`${card.bg} rounded-2xl p-5 border border-white/60 shadow-sm hover:shadow-md transition-shadow`}>
                <div className="flex items-center justify-between mb-3">
                  <div className={`${card.iconBg} p-2.5 rounded-xl`}>
                    <Icon className={`w-5 h-5 ${card.textColor}`} />
                  </div>
                </div>
                <p className="text-sm font-medium text-gray-500 mb-1">{card.label}</p>
                <p className={`text-2xl font-bold ${card.textColor}`}>
                  {typeof card.value === 'number' ? card.value.toLocaleString('fr-FR') : card.value}
                </p>
              </div>
            );
          })}
        </div>

        {/* Quick stats row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <Calendar className="w-5 h-5 mr-2 text-blue-600" />
              Cette semaine
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Réservations</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.bookings_this_week ?? 0}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Revenus</p>
                <p className="text-2xl font-bold text-green-600">{Number(stats?.revenue_this_week ?? 0).toLocaleString('fr-FR')} <span className="text-sm">FCFA</span></p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-emerald-600" />
              Ce mois
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Réservations</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.bookings_this_month ?? 0}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Revenus</p>
                <p className="text-2xl font-bold text-green-600">{Number(stats?.revenue_this_month ?? 0).toLocaleString('fr-FR')} <span className="text-sm">FCFA</span></p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <AdminCharts stats={stats} companies={companies} trips={trips} />
        </div>
      </div>
    );
  };

  const renderCompanies = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-900">Gestion des compagnies</h2>
        <button onClick={() => setShowAddCompanyModal(true)} className="px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-sm font-medium flex items-center">
          <Building className="w-4 h-4 mr-2" /> Ajouter
        </button>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Compagnie</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Statut</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {companies.map(c => (
                <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center mr-3 flex-shrink-0">
                        <Building className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">{c.name}</div>
                        <div className="text-sm text-gray-500">{c.address || ''}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{c.email}</div>
                    <div className="text-sm text-gray-500">{c.phone}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${c.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {c.isActive ? '● Active' : '● Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => handleEditCompany(c)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit className="w-4 h-4" /></button>
                      <button onClick={() => setCompanyToDelete(c)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {companies.length === 0 && <div className="p-8 text-center text-gray-400">Aucune compagnie pour le moment</div>}
      </div>
    </div>
  );

  const renderTrips = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-900">Gestion des trajets</h2>
        <button onClick={() => setShowAddTripModal(true)} className="px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-sm font-medium flex items-center">
          <Bus className="w-4 h-4 mr-2" /> Ajouter
        </button>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Trajet</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Compagnie</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Prix</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Capacité</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {trips.map(t => (
                <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center mr-3 flex-shrink-0">
                        <Bus className="w-5 h-5 text-violet-600" />
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">{t.departureCity} → {t.arrivalCity}</div>
                        <div className="text-sm text-gray-500">{t.departureTime} - {t.arrivalTime} • {t.busType}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">{t.companyName}</td>
                  <td className="px-6 py-4 font-semibold text-gray-900">{Number(t.price || 0).toLocaleString('fr-FR')} FCFA</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{t.capacity} places</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => handleEditTrip(t)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit className="w-4 h-4" /></button>
                      <button onClick={() => setTripToDelete(t)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {trips.length === 0 && <div className="p-8 text-center text-gray-400">Aucun trajet pour le moment</div>}
      </div>
    </div>
  );

  const renderUsers = () => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = users.filter(u => { if (!q) return true; return (`${u.firstName} ${u.lastName}`.toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q)); });
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const page = Math.min(Math.max(1, currentPage), totalPages);
    const start = (page - 1) * pageSize;
    const paginated = filtered.slice(start, start + pageSize);

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Gestion des utilisateurs</h2>
            <p className="text-sm text-gray-500 mt-1">{users.length} utilisateur{users.length > 1 ? 's' : ''} enregistré{users.length > 1 ? 's' : ''}</p>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-initial">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                placeholder="Rechercher..."
                className="w-full sm:w-64 pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
            <button className="px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors flex items-center text-sm font-medium shadow-sm">
              <Download className="w-4 h-4 mr-2" />Exporter
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {filtered.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">Aucun utilisateur trouvé</p>
              <p className="text-gray-400 text-sm mt-1">Les utilisateurs apparaîtront ici après inscription</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Utilisateur</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Rôle</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Statut</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Inscription</th>
                      <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {paginated.map(user => (
                      <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mr-3 flex-shrink-0">
                              <span className="text-white text-sm font-semibold">{(user.firstName?.[0] || user.email?.[0] || '?').toUpperCase()}</span>
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900">{user.firstName} {user.lastName}</div>
                              <div className="text-xs text-gray-400">{user.phone_number || ''}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{user.email}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${user.role === 'admin' ? 'bg-red-50 text-red-700' : user.role === 'company' ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                            {user.role === 'admin' ? 'Admin' : user.role === 'company' ? 'Compagnie' : 'Utilisateur'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full ${user.isActive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${user.isActive ? 'bg-green-500' : 'bg-red-500'}`}></span>
                            {user.isActive ? 'Actif' : 'Inactif'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">{user.createdAt ? new Date(user.createdAt).toLocaleDateString('fr-FR') : '-'}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => handleViewUser(user)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Voir"><Eye className="w-4 h-4" /></button>
                            <button onClick={() => handleEditUser(user)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Modifier"><Edit className="w-4 h-4" /></button>
                            <button onClick={() => handleToggleUserActive(user)} className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title={user.isActive ? 'Désactiver' : 'Activer'}><Lock className="w-4 h-4" /></button>
                            <button onClick={() => handleDeleteUser(user)} className={`p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors ${deletingUserId ? 'opacity-40 cursor-not-allowed' : ''}`} disabled={!!deletingUserId} title="Supprimer"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-gray-100 bg-gray-50/50">
                <span className="text-sm text-gray-500">
                  {start + 1}–{Math.min(start + pageSize, filtered.length)} sur {filtered.length} utilisateur{filtered.length > 1 ? 's' : ''}
                </span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-2 border border-gray-200 rounded-lg hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"><ChevronLeft className="w-4 h-4" /></button>
                  <span className="text-sm font-medium text-gray-700 px-3">Page {page}/{totalPages}</span>
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="p-2 border border-gray-200 rounded-lg hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"><ChevronRight className="w-4 h-4" /></button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  const renderReports = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Rapports et exports</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <button onClick={() => setShowExportModal(true)} className="p-6 bg-white border border-gray-100 rounded-2xl hover:shadow-md transition-all text-left group">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><FileText className="w-6 h-6 text-blue-600" /></div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Export des tickets</h3>
          <p className="text-sm text-gray-500">Générer des rapports de tickets en PDF ou Excel</p>
        </button>
        <button className="p-6 bg-white border border-gray-100 rounded-2xl hover:shadow-md transition-all text-left group">
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><DollarSign className="w-6 h-6 text-green-600" /></div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Rapport financier</h3>
          <p className="text-sm text-gray-500">Analyser les revenus et performances</p>
        </button>
        <button className="p-6 bg-white border border-gray-100 rounded-2xl hover:shadow-md transition-all text-left group">
          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><Users className="w-6 h-6 text-purple-600" /></div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Rapport utilisateurs</h3>
          <p className="text-sm text-gray-500">Statistiques d'utilisation et engagement</p>
        </button>
      </div>
    </div>
  );

  // ============ MAIN RENDER ============
  return (
    <div className="min-h-screen bg-gray-50/80">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 sm:h-20">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Administration Evexticket</h1>
              <p className="text-sm text-gray-500 hidden sm:block">Gérez votre plateforme de transport</p>
            </div>
            <button onClick={() => window.location.reload()} className="p-2.5 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-colors" title="Rafraîchir">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Tabs */}
        <div className="mb-6 -mx-4 px-4 overflow-x-auto">
          <nav className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit min-w-full sm:min-w-0">
            {tabs.map(t => {
              const Icon = t.icon;
              const isActive = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${isActive ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  <Icon className="w-4 h-4" />
                  {t.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div>
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <svg className="animate-spin w-10 h-10 text-blue-600 mx-auto mb-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                <p className="text-gray-500">Chargement du tableau de bord...</p>
              </div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
              <p className="text-red-600 font-medium">{error}</p>
              <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm">Réessayer</button>
            </div>
          ) : (
            <>
              {activeTab === 'overview' && renderOverview()}
              {activeTab === 'companies' && renderCompanies()}
              {activeTab === 'trips' && renderTrips()}
              {activeTab === 'users' && renderUsers()}
              {activeTab === 'reports' && renderReports()}
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      <AddCompanyModal isOpen={showAddCompanyModal} onClose={() => { setShowAddCompanyModal(false); setEditingCompany(null); }} onSave={handleAddCompany as any} editingCompany={editingCompany as any} />
      <AddTripModal isOpen={showAddTripModal} onClose={() => { setShowAddTripModal(false); setEditingTrip(null); }} onSave={handleAddTrip as any} editingTrip={editingTrip as any} companies={companies as any} cities={apiCities as any} />
      <ExportTicketsModal isOpen={showExportModal} onClose={() => setShowExportModal(false)} onExport={() => {}} />

      {/* Confirmation dialogs */}
      {companyToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-2">Supprimer la compagnie</h2>
            <p className="text-gray-600 mb-6">Êtes-vous sûr de vouloir supprimer <b>{companyToDelete.name}</b> ? Cette action est irréversible.</p>
            <div className="flex justify-end gap-3">
              <button className="px-4 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors" onClick={() => setCompanyToDelete(null)}>Annuler</button>
              <button className="px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors" onClick={confirmDeleteCompany}>Supprimer</button>
            </div>
          </div>
        </div>
      )}

      {tripToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-2">Supprimer le trajet</h2>
            <p className="text-gray-600 mb-6">Êtes-vous sûr de vouloir supprimer ce trajet ?</p>
            <div className="flex justify-end gap-3">
              <button className="px-4 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors" onClick={() => setTripToDelete(null)}>Annuler</button>
              <button className="px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors" onClick={confirmDeleteTrip}>Supprimer</button>
            </div>
          </div>
        </div>
      )}

      {userToConfirmDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-2">Supprimer l'utilisateur</h2>
            <p className="text-gray-600 mb-6">Êtes-vous sûr de vouloir supprimer <b>{userToConfirmDelete.firstName} {userToConfirmDelete.lastName}</b> ?</p>
            <div className="flex justify-end gap-3">
              <button className="px-4 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors" onClick={() => setUserToConfirmDelete(null)}>Annuler</button>
              <button className="px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors" onClick={confirmDeleteUser}>Supprimer</button>
            </div>
          </div>
        </div>
      )}

      <NotificationModal isOpen={showNotification} onClose={() => setShowNotification(false)} type={notificationData.type} title={notificationData.title} message={notificationData.message} confirmText={notificationData.confirmText} onConfirm={notificationData.onConfirm} />
      <UserDetailsModal isOpen={showUserDetails} onClose={() => { setShowUserDetails(false); setSelectedUser(null); }} user={selectedUser} onSave={handleSaveUserDetails} />
    </div>
  );
};

export default AdminDashboard;

