import React, { useEffect, useState } from 'react';
import apiService from '../services/api';
import { useCities } from '../hooks/useApi';
import { Users, Building, DollarSign, Edit, Trash2, Eye, Download, Bus, FileText, BarChart3, Lock } from 'lucide-react';
import AddCompanyModal from './AddCompanyModal';
import AddTripModal from './AddTripModal';
import ExportTicketsModal from './ExportTicketsModal';
import AdminCharts from './AdminCharts';
import NotificationModal from './NotificationModal';
import UserDetailsModal from './UserDetailsModal';

type Company = { id: string; name: string; description?: string; address?: string; phone?: string; email?: string; website?: string; logo?: string; isActive?: boolean; createdAt?: string };
type Trip = { id: string; companyId?: string; companyName?: string; departureCity?: string; arrivalCity?: string; departureTime?: string; arrivalTime?: string; price?: number; duration?: number; busType?: string; capacity?: number; isActive?: boolean };
type User = { id: string; firstName?: string; lastName?: string; email?: string; phone?: string; role?: 'user' | 'company' | 'admin'; isActive?: boolean; createdAt?: string };

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [showAddCompanyModal, setShowAddCompanyModal] = useState(false);
  const [showAddTripModal, setShowAddTripModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);

  const [stats, setStats] = useState<any>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const { cities: apiCities } = useCities();

  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const [showUserDetails, setShowUserDetails] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userToConfirmDelete, setUserToConfirmDelete] = useState<User | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null);
  const [deletingCompanyId, setDeletingCompanyId] = useState<string | null>(null);
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
        const [s, comps, tps] = await Promise.all([apiService.getDashboardStats(), apiService.getCompanies(), apiService.getTrips()]);
        if (!mounted) return;
        setStats(s || {});
        setCompanies(((comps as any[]) || []).map(c => ({ id: String(c.id), name: c.name, description: c.description || '', address: c.address || '', phone: c.phone || '', email: c.email || '', website: c.website || '', logo: c.logo || '', isActive: c.is_active, createdAt: c.created_at })));
        setTrips(((tps as any[]) || []).map(t => ({ id: String(t.id), companyId: String(t.company), companyName: t.company_name || '', departureCity: t.departure_city_name || String(t.departure_city), arrivalCity: t.arrival_city_name || String(t.arrival_city), departureTime: t.departure_time, arrivalTime: t.arrival_time, price: t.price, duration: t.duration, busType: t.bus_type, capacity: t.capacity, isActive: t.is_active })));
        let usersData: any[] = [];
        try { usersData = await apiService.getUsers(); } catch (e) { usersData = []; }
        setUsers((usersData || []).map(u => ({ id: String(u.id), firstName: u.first_name || u.firstName || '', lastName: u.last_name || u.lastName || '', email: u.email || '', phone: u.phone || '', role: u.is_staff ? 'admin' : (u.is_company_admin ? 'company' : 'user'), isActive: u.is_active ?? true, createdAt: u.created_at || '' })));
      } catch (e: any) { console.error(e); setError(e?.message || 'Erreur'); }
      finally { setLoading(false); }
    };
    load();
    return () => { mounted = false };
  }, []);

  // companies
  const handleAddCompany = async (payload: any) => {
    try {
      if (payload.id) {
        const updated = await apiService.updateCompany(Number(payload.id), payload);
        setCompanies(prev => prev.map(c => c.id === String(updated.id) ? ({ ...c, name: updated.name }) : c));
        setNotificationData({ type: 'success', title: 'Modifié', message: 'La compagnie a été modifiée.' });
      } else {
        const created = await apiService.createCompany(payload);
        setCompanies(prev => [{ id: String(created.id), name: created.name, description: created.description || '', address: created.address || '', phone: created.phone || '', email: created.email || '', website: created.website || '', logo: created.logo || '', isActive: created.is_active, createdAt: created.created_at }, ...prev]);
        setNotificationData({ type: 'success', title: 'Créée', message: 'La compagnie a été créée.' });
      }
    } catch (e: any) { setNotificationData({ type: 'error', title: 'Erreur', message: e?.message || 'Erreur' }); }
    setShowNotification(true);
    setShowAddCompanyModal(false);
    setEditingCompany(null);
  };

  const handleEditCompany = (c: Company) => { setEditingCompany(c); setShowAddCompanyModal(true); };
  const confirmDeleteCompany = async () => {
    if (!companyToDelete) return;
    const id = companyToDelete.id;
    const prev = companies.slice();
    setCompanies(prev => prev.filter(x => x.id !== id));
    setDeletingCompanyId(id);
    const maxAttempts = 3; let attempt = 0; let lastErr: any = null; const sleep = (ms:number)=>new Promise(r=>setTimeout(r,ms));
    while (attempt < maxAttempts) {
      try { attempt++; await apiService.deleteCompany(Number(id)); lastErr = null; break; } catch (e:any) { lastErr = e; if (attempt < maxAttempts) await sleep(500*attempt); }
    }
    if (lastErr) { setCompanies(prev); setNotificationData({ type: 'error', title: 'Erreur', message: lastErr?.message || 'Impossible de supprimer.' }); }
    else { setNotificationData({ type: 'success', title: 'Supprimée', message: 'Compagnie supprimée.' }); }
    setShowNotification(true); setDeletingCompanyId(null);
  };

  // trips
  const handleAddTrip = async (payload:any) => {
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
    } catch (e:any) { setNotificationData({ type: 'error', title: 'Erreur', message: e?.message || 'Erreur' }); }
    setShowNotification(true); setShowAddTripModal(false); setEditingTrip(null);
  };
  const handleEditTrip = (t:Trip) => { setEditingTrip(t); setShowAddTripModal(true); };
  const confirmDeleteTrip = async () => { if (!tripToDelete) return; try { await apiService.deleteTrip(Number(tripToDelete.id)); setTrips(prev => prev.filter(x => x.id !== tripToDelete.id)); setNotificationData({ type: 'success', title: 'Supprimé', message: 'Trajet supprimé.' }); } catch (e:any) { setNotificationData({ type: 'error', title: 'Erreur', message: e?.message || 'Erreur' }); } setShowNotification(true); setTripToDelete(null); };

  // users
  const handleViewUser = (u:User) => { setSelectedUser(u); setShowUserDetails(true); };
  const handleSaveUserDetails = async (payload:any) => {
    try {
      const resp = await apiService.updateUser(Number(payload.id), { first_name: payload.firstName, last_name: payload.lastName, email: payload.email, phone: payload.phone, is_active: payload.isActive });
      setUsers(prev => prev.map(p => p.id === String(resp.id) ? ({ ...p, firstName: resp.first_name || p.firstName, lastName: resp.last_name || p.lastName, email: resp.email || p.email, phone: resp.phone || p.phone, isActive: resp.is_active ?? p.isActive }) : p));
      setNotificationData({ type: 'success', title: 'Enregistré', message: 'Utilisateur mis à jour.' }); setShowNotification(true); setShowUserDetails(false); setSelectedUser(null);
    } catch (e:any) { setNotificationData({ type: 'error', title: 'Erreur', message: e?.message || 'Erreur' }); setShowNotification(true); }
  };

  const handleToggleUserActive = async (u:User) => {
    try { const updated = await apiService.updateUser(Number(u.id), { is_active: !u.isActive }); setUsers(prev => prev.map(p => p.id === String(updated.id) ? ({ ...p, isActive: updated.is_active ?? p.isActive }) : p)); setNotificationData({ type: 'success', title: 'Statut changé', message: `Utilisateur ${updated.is_active ? 'activé' : 'désactivé'}`}); setShowNotification(true); } catch (e:any) { setNotificationData({ type: 'error', title: 'Erreur', message: e?.message || 'Erreur' }); setShowNotification(true); }
  };

  // delete with optimistic remove + undo window
  const handleDeleteUser = (u:User) => { setUserToConfirmDelete(u); };
  const confirmDeleteUser = () => {
    if (!userToConfirmDelete) return;
    const u = userToConfirmDelete;
    const prev = users.slice();
    setUsers(s => s.filter(x => x.id !== u.id));
    setDeletingUserId(u.id);
    setUserToConfirmDelete(null);

    setNotificationData({ type: 'warning', title: 'Utilisateur supprimé', message: 'Annulation possible pendant 5 secondes.', confirmText: 'Annuler', onConfirm: () => { setUsers(prev); setDeletingUserId(null); setShowNotification(false); } } as any);
    setShowNotification(true);

    const timeoutId = window.setTimeout(async () => {
      try {
        let attempt = 0; const maxAttempts = 3; let lastErr:any = null;
        while (attempt < maxAttempts) { try { attempt++; await apiService.deleteUser(Number(u.id)); lastErr = null; break; } catch (e:any) { lastErr = e; if (attempt < maxAttempts) await new Promise(r=>setTimeout(r,500*attempt)); } }
        if (lastErr) { setUsers(prev); setNotificationData({ type: 'error', title: 'Erreur', message: lastErr?.message || 'Impossible de supprimer' }); }
        else { setNotificationData({ type: 'success', title: 'Supprimé', message: 'Utilisateur supprimé définitivement' }); }
        setShowNotification(true);
      } finally { setDeletingUserId(null); }
    }, 5000);
    // not storing timeoutId globally for simplicity
  };

  // tabs
  const tabs = [ { id: 'overview', label: "Vue d'ensemble", icon: BarChart3 }, { id: 'companies', label: 'Compagnies', icon: Building }, { id: 'trips', label: 'Trajets', icon: Bus }, { id: 'users', label: 'Utilisateurs', icon: Users }, { id: 'reports', label: 'Rapports', icon: FileText } ];

  // persist tab
  useEffect(() => { try { const params = new URLSearchParams(window.location.search); const t = params.get('tab'); if (t) setActiveTab(t); else { const saved = localStorage.getItem('admin_active_tab'); if (saved) setActiveTab(saved); } } catch (e) {} }, []);
  useEffect(() => { try { const params = new URLSearchParams(window.location.search); if (activeTab) params.set('tab', activeTab); else params.delete('tab'); const newUrl = window.location.pathname + (Array.from(params.keys()).length ? `?${params.toString()}` : ''); window.history.replaceState(null, '', newUrl); localStorage.setItem('admin_active_tab', activeTab); } catch (e) {} }, [activeTab]);

  // renderers
  const renderOverview = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Utilisateurs</p>
              <p className="text-3xl font-bold text-gray-900">{(stats?.total_users ?? stats?.totalUsers ?? users.length).toLocaleString()}</p>
            </div>
            <Users className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Compagnies</p>
              <p className="text-3xl font-bold text-gray-900">{(stats?.total_companies ?? companies.length)}</p>
            </div>
            <Building className="w-8 h-8 text-green-600" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Trajets</p>
              <p className="text-3xl font-bold text-gray-900">{(stats?.total_trips ?? trips.length)}</p>
            </div>
            <Bus className="w-8 h-8 text-purple-600" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Réservations</p>
              <p className="text-3xl font-bold text-gray-900">{(stats?.total_bookings ?? 0)}</p>
            </div>
            <FileText className="w-8 h-8 text-orange-600" />
          </div>
        </div>
      </div>
      <AdminCharts stats={stats} companies={companies} trips={trips} />
    </div>
  );

  const renderCompanies = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Gestion des compagnies</h2>
        <button onClick={() => setShowAddCompanyModal(true)} className="px-4 py-2 bg-blue-600 text-white rounded">Ajouter</button>
      </div>
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50"><tr><th className="p-4 text-left">Compagnie</th><th className="p-4 text-left">Contact</th><th className="p-4 text-left">Statut</th><th className="p-4">Actions</th></tr></thead>
          <tbody>{companies.map(c => (<tr key={c.id} className="hover:bg-gray-50"><td className="p-4">{c.name}</td><td className="p-4">{c.email}<div className="text-sm text-gray-500">{c.phone}</div></td><td className="p-4">{c.isActive ? 'Active' : 'Inactive'}</td><td className="p-4"><button onClick={() => handleEditCompany(c)} className="mr-2 text-blue-600"><Edit className="w-4 h-4"/></button><button onClick={() => { setCompanyToDelete(c); }} className="text-red-600"><Trash2 className="w-4 h-4"/></button></td></tr>))}</tbody>
        </table>
      </div>
    </div>
  );

  const renderTrips = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Gestion des trajets</h2>
        <button onClick={() => setShowAddTripModal(true)} className="px-4 py-2 bg-blue-600 text-white rounded">Ajouter</button>
      </div>
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full"><thead className="bg-gray-50"><tr><th className="p-4">Trajet</th><th className="p-4">Compagnie</th><th className="p-4">Prix</th><th className="p-4">Actions</th></tr></thead>
        <tbody>{trips.map(t=> (<tr key={t.id} className="hover:bg-gray-50"><td className="p-4">{t.departureCity} → {t.arrivalCity}</td><td className="p-4">{t.companyName}</td><td className="p-4">{t.price?.toLocaleString?.() ?? t.price} FCFA</td><td className="p-4"><button onClick={() => handleEditTrip(t)} className="mr-2 text-blue-600"><Edit className="w-4 h-4"/></button><button onClick={() => { setTripToDelete(t); }} className="text-red-600"><Trash2 className="w-4 h-4"/></button></td></tr>))}</tbody></table>
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
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">Gestion des utilisateurs</h2>
          <div className="flex space-x-2">
            <div className="flex items-center border border-gray-200 rounded-lg px-3 py-1">
              <input value={searchQuery} onChange={e=>{ setSearchQuery(e.target.value); setCurrentPage(1); }} placeholder="Rechercher par nom ou email" className="outline-none text-sm" />
            </div>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"><Download className="w-4 h-4 mr-2"/>Exporter</button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            {filtered.length === 0 ? (<div className="p-6 text-center text-gray-600">Aucun utilisateur trouvé.</div>) : (
              <table className="w-full">
                <thead className="bg-gray-50"><tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Utilisateur</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rôle</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Inscription</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th></tr></thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginated.map(user => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap"><div className="flex items-center"><div className="flex-shrink-0 h-10 w-10"><div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center"><Users className="h-6 w-6 text-gray-600"/></div></div><div className="ml-4"><div className="text-sm font-medium text-gray-900">{user.firstName} {user.lastName}</div></div></div></td>
                      <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-gray-900">{user.email}</div><div className="text-sm text-gray-500">{user.phone}</div></td>
                      <td className="px-6 py-4 whitespace-nowrap"><span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${user.role === 'admin' ? 'bg-red-100 text-red-800' : user.role === 'company' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>{user.role === 'admin' ? 'Admin' : user.role === 'company' ? 'Compagnie' : 'Utilisateur'}</span></td>
                      <td className="px-6 py-4 whitespace-nowrap"><span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{user.isActive ? 'Actif' : 'Inactif'}</span></td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.createdAt ? new Date(user.createdAt).toLocaleDateString('fr-FR') : '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium"><div className="flex space-x-2"><button onClick={()=>handleViewUser(user)} className="text-blue-600 hover:text-blue-900"><Eye className="w-4 h-4"/></button><button onClick={()=>handleEditUser(user)} className="text-green-600 hover:text-green-900"><Edit className="w-4 h-4"/></button><button onClick={()=>handleToggleUserActive(user)} className="text-yellow-600 hover:text-yellow-900"><Lock className="w-4 h-4"/></button><button onClick={()=>handleDeleteUser(user)} className={`text-red-600 hover:text-red-900 ${deletingUserId ? 'opacity-60 cursor-not-allowed' : ''}`} disabled={!!deletingUserId}><Trash2 className="w-4 h-4"/></button></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {filtered.length > 0 && (
            <div className="p-4 flex items-center justify-between">
              <div className="text-sm text-gray-600">Affichage {start + 1} - {Math.min(start + pageSize, filtered.length)} sur {filtered.length}</div>
              <div className="space-x-2"><button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} className="px-3 py-1 border rounded" disabled={page === 1}>Préc</button><button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} className="px-3 py-1 border rounded" disabled={page >= totalPages}>Suiv</button></div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderReports = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Rapports et exports</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <button onClick={() => setShowExportModal(true)} className="p-6 bg-white border border-gray-200 rounded-xl hover:shadow-md transition-shadow text-left"><FileText className="w-8 h-8 text-blue-600 mb-4" /><h3 className="text-lg font-semibold text-gray-900 mb-2">Export des tickets</h3><p className="text-sm text-gray-600">Générer des rapports de tickets en PDF ou Excel</p></button>
        <button className="p-6 bg-white border border-gray-200 rounded-xl hover:shadow-md transition-shadow text-left"><BarChart3 className="w-8 h-8 text-green-600 mb-4" /><h3 className="text-lg font-semibold text-gray-900 mb-2">Rapport financier</h3><p className="text-sm text-gray-600">Analyser les revenus et performances</p></button>
        <button className="p-6 bg-white border border-gray-200 rounded-xl hover:shadow-md transition-shadow text-left"><Users className="w-8 h-8 text-purple-600 mb-4" /><h3 className="text-lg font-semibold text-gray-900 mb-2">Rapport utilisateurs</h3><p className="text-sm text-gray-600">Statistiques d'utilisation et engagement</p></button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Administration Evexticket</h1>
              <p className="text-gray-600">Gérez votre plateforme de transport</p>
            </div>
            <div className="flex items-center space-x-4">
              <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"><Download className="w-4 h-4 mr-2"/>Exporter</button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            {tabs.map(t => { const Icon = t.icon; return (<button key={t.id} onClick={() => setActiveTab(t.id)} className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center ${activeTab === t.id ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}><Icon className="w-4 h-4 mr-2"/>{t.label}</button>) })}
          </nav>
        </div>

        <div>
          {activeTab === 'overview' && (loading ? <div className="p-6 text-center">Chargement...</div> : error ? <div className="p-6 text-center text-red-600">{error}</div> : renderOverview())}
          {activeTab === 'companies' && renderCompanies()}
          {activeTab === 'trips' && renderTrips()}
          {activeTab === 'users' && renderUsers()}
          {activeTab === 'reports' && renderReports()}
        </div>
      </div>

      <AddCompanyModal isOpen={showAddCompanyModal} onClose={() => { setShowAddCompanyModal(false); setEditingCompany(null); }} onSave={handleAddCompany} editingCompany={editingCompany} />
      <AddTripModal isOpen={showAddTripModal} onClose={() => { setShowAddTripModal(false); setEditingTrip(null); }} onSave={handleAddTrip as any} editingTrip={editingTrip} companies={companies} cities={apiCities} />
      <ExportTicketsModal isOpen={showExportModal} onClose={() => setShowExportModal(false)} onExport={() => {}} />

      {/* confirmations */}
      {companyToDelete && (<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"><div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6"><h2 className="text-xl font-bold mb-4">Confirmer la suppression</h2><p className="mb-6">Êtes-vous sûr de vouloir supprimer la compagnie <b>{companyToDelete.name}</b> ? Cette action est irréversible.</p><div className="flex justify-end space-x-4"><button className="px-4 py-2 border border-gray-300 rounded-lg" onClick={() => setCompanyToDelete(null)}>Annuler</button><button className="px-4 py-2 bg-red-600 text-white rounded-lg" onClick={confirmDeleteCompany}>Supprimer</button></div></div></div>)}

      {tripToDelete && (<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"><div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6"><h2 className="text-xl font-bold mb-4">Confirmer la suppression du trajet</h2><p className="mb-6">Êtes-vous sûr de vouloir supprimer ce trajet ?</p><div className="flex justify-end space-x-4"><button className="px-4 py-2 border border-gray-300 rounded-lg" onClick={() => setTripToDelete(null)}>Annuler</button><button className="px-4 py-2 bg-red-600 text-white rounded-lg" onClick={confirmDeleteTrip}>Supprimer</button></div></div></div>)}

      {userToConfirmDelete && (<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"><div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6"><h2 className="text-xl font-bold mb-4">Confirmer la suppression de l'utilisateur</h2><p className="mb-6">Êtes-vous sûr de vouloir supprimer <b>{userToConfirmDelete.firstName} {userToConfirmDelete.lastName}</b> ? Vous pourrez annuler pendant 5 secondes.</p><div className="flex justify-end space-x-4"><button className="px-4 py-2 border border-gray-300 rounded-lg" onClick={() => setUserToConfirmDelete(null)}>Annuler</button><button className="px-4 py-2 bg-red-600 text-white rounded-lg" onClick={confirmDeleteUser}>Supprimer</button></div></div></div>)}

      <NotificationModal isOpen={showNotification} onClose={() => setShowNotification(false)} type={notificationData.type} title={notificationData.title} message={notificationData.message} confirmText={notificationData.confirmText} onConfirm={notificationData.onConfirm} />
      <UserDetailsModal isOpen={showUserDetails} onClose={() => { setShowUserDetails(false); setSelectedUser(null); }} user={selectedUser} onSave={handleSaveUserDetails} />
    </div>
  );
};

export default AdminDashboard;