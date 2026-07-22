import React from 'react';
import {
  Building2,
  Bus,
  CalendarDays,
  CircleDollarSign,
  LayoutDashboard,
  LogOut,
  MapPinned,
  Route,
  Settings,
  Ticket,
  Users,
} from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { companyNavigationItems } from '../utils/companyNavigation';

const icons = {
  dashboard: LayoutDashboard,
  company: Building2,
  agencies: MapPinned,
  personnel: Users,
  buses: Bus,
  routes: Route,
  trips: CalendarDays,
  tickets: Ticket,
  revenues: CircleDollarSign,
  settings: Settings,
};

const Sidebar: React.FC = () => {
  const auth = useAuth();
  const navigate = useNavigate();

  const logout = () => {
    auth.logout();
    navigate('/login', { replace: true });
  };

  return (
    <aside className="sticky top-0 hidden h-screen w-72 shrink-0 border-r border-slate-200 bg-white lg:block">
      <div className="flex h-full flex-col px-5 py-6">
        <NavLink to="/company/tableau-de-bord" className="mb-8 flex items-center gap-3 px-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-500 font-bold text-white">E</div>
          <div>
            <div className="text-lg font-bold text-slate-900">EvexTicket</div>
            <div className="text-xs text-slate-400">Administration compagnie</div>
          </div>
        </NavLink>

        <nav className="space-y-1" aria-label="Navigation compagnie">
          {companyNavigationItems.map((item) => {
            const Icon = icons[item.key];
            return (
              <NavLink
                key={item.key}
                to={item.path}
                className={({ isActive }) => `flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-slate-100 pt-4">
          <button type="button" onClick={logout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50">
            <LogOut className="h-4 w-4" />
            Déconnexion
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
