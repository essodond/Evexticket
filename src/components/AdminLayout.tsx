import React from 'react';
import { BarChart3, Building2, CalendarClock, ClipboardList, LayoutDashboard, LogOut, Menu, Settings, Ticket, Users, WalletCards } from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const links = [
  { to: 'tableau-de-bord', label: 'Tableau de bord', icon: LayoutDashboard },
  { to: 'compagnies', label: 'Compagnies', icon: Building2 },
  { to: 'utilisateurs', label: 'Utilisateurs', icon: Users },
  { to: 'voyages', label: 'Voyages', icon: CalendarClock },
  { to: 'billets', label: 'Billets', icon: Ticket },
  { to: 'finances', label: 'Finances', icon: WalletCards },
  { to: 'statistiques', label: 'Statistiques', icon: BarChart3 },
  { to: 'audit', label: 'Journal d’audit', icon: ClipboardList },
  { to: 'parametres', label: 'Paramètres', icon: Settings },
];

const Navigation: React.FC = () => <nav className="space-y-1" aria-label="Administration générale">{links.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${isActive ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}><Icon className="h-4 w-4" />{label}</NavLink>)}</nav>;

const AdminLayout: React.FC = () => {
  const auth = useAuth();
  const navigate = useNavigate();
  const name = [auth.user?.first_name, auth.user?.last_name].filter(Boolean).join(' ') || auth.user?.email || 'Administrateur';
  const logout = () => { auth.logout(); navigate('/admin/login', { replace: true }); };
  return <div className="min-h-screen bg-slate-50"><div className="flex min-h-screen"><aside className="sticky top-0 hidden h-screen w-72 shrink-0 border-r border-slate-200 bg-white lg:block"><div className="flex h-full flex-col px-5 py-6"><NavLink to="/admin/tableau-de-bord" className="mb-8 flex items-center gap-3 px-2"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 font-extrabold text-white">E</div><div><p className="font-extrabold text-slate-950">EvexTicket</p><p className="text-xs text-slate-400">Administration générale</p></div></NavLink><Navigation/><button type="button" onClick={logout} className="mt-auto flex items-center gap-3 rounded-xl border-t border-slate-100 px-3 py-3 text-sm font-semibold text-red-600 hover:bg-red-50"><LogOut className="h-4 w-4"/>Déconnexion</button></div></aside><div className="min-w-0 flex-1"><header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur"><div className="flex min-h-20 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8"><div><p className="text-sm font-bold text-slate-950">Pilotage de la plateforme</p><p className="mt-1 text-xs text-slate-500">Toutes les compagnies et opérations EVEX</p></div><div className="flex items-center gap-3"><div className="hidden text-right sm:block"><p className="text-sm font-semibold text-slate-900">{name}</p><p className="text-xs text-slate-500">Super administrateur</p></div><div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 font-bold text-blue-700">{name.charAt(0).toUpperCase()}</div></div></div></header><details className="border-b border-slate-200 bg-white px-4 py-3 lg:hidden"><summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-slate-700"><Menu className="h-4 w-4"/>Menu administration</summary><div className="mt-3"><Navigation/></div><button type="button" onClick={logout} className="mt-3 flex w-full items-center gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-700"><LogOut className="h-4 w-4"/>Déconnexion</button></details><main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8"><Outlet/></main></div></div></div>;
};

export default AdminLayout;
