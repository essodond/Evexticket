import React, { useCallback, useEffect, useState } from 'react';
import {
  Bus,
  History,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  QrCode,
  TicketPlus,
} from 'lucide-react';
import { NavLink, Outlet, useNavigate, useOutletContext } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import apiService from '../../services/api';
import type { GuichetDashboardData } from '../../services/api';
import { guichetNavigationItems, type GuichetNavigationKey } from '../../utils/guichetNavigation';

interface GuichetPortalContextValue {
  dashboard: GuichetDashboardData | null;
  loading: boolean;
  error: string | null;
  refreshDashboard: () => Promise<void>;
}

export const useGuichetPortal = () => useOutletContext<GuichetPortalContextValue>();

const icons: Record<GuichetNavigationKey, React.ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard,
  sale: TicketPlus,
  trips: Bus,
  scanner: QrCode,
  history: History,
};

const GuichetLayout: React.FC = () => {
  const auth = useAuth();
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState<GuichetDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshDashboard = useCallback(async () => {
    setLoading(true);
    try {
      setDashboard(await apiService.getGuichetDashboard());
      setError(null);
    } catch (loadError: any) {
      setError(loadError?.message || 'Impossible de charger les informations du guichet.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refreshDashboard(); }, [refreshDashboard]);

  const logout = () => {
    auth.logout();
    navigate('/login', { replace: true });
  };

  const agentName = dashboard
    ? `${dashboard.agent.prenom} ${dashboard.agent.nom}`
    : [auth.user?.first_name, auth.user?.last_name].filter(Boolean).join(' ') || auth.user?.email || 'Agent guichet';

  const navigation = (
    <nav className="space-y-1" aria-label="Navigation guichet">
      {guichetNavigationItems.map((item) => {
        const Icon = icons[item.key];
        return (
          <NavLink key={item.key} to={item.path} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${isActive ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
            <Icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex min-h-screen">
        <aside className="sticky top-0 hidden h-screen w-72 shrink-0 border-r border-slate-200 bg-white lg:block">
          <div className="flex h-full flex-col px-5 py-6">
            <NavLink to="/guichet/tableau-de-bord" className="mb-8 flex items-center gap-3 px-2">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 font-bold text-white">E</div>
              <div><div className="text-lg font-bold text-slate-900">EvexTicket</div><div className="text-xs text-slate-400">Espace guichet</div></div>
            </NavLink>
            {navigation}
            <div className="mt-auto border-t border-slate-100 pt-4">
              <button type="button" onClick={logout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50"><LogOut className="h-4 w-4" /> Déconnexion</button>
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
            <div className="flex min-h-20 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">{dashboard?.agent.compagnie || 'Compagnie'}</p>
                <div className="mt-1 flex items-center gap-2 text-xs text-slate-500"><MapPin className="h-3.5 w-3.5" /><span className="truncate">{dashboard?.agent.agence?.nom || 'Aucune agence'}{dashboard?.agent.guichet ? ` · ${dashboard.agent.guichet.code} — ${dashboard.agent.guichet.nom}` : ''}</span></div>
              </div>
              <div className="flex items-center gap-3">
                <div className="hidden text-right sm:block"><p className="text-sm font-semibold text-slate-900">{agentName}</p><p className="text-xs text-slate-500">Agent guichet</p></div>
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-sm font-bold text-blue-700">{agentName.charAt(0).toUpperCase()}</div>
              </div>
            </div>
          </header>

          <details className="border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
            <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-slate-700"><Menu className="h-4 w-4" /> Menu guichet</summary>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">{navigation}</div>
            <button type="button" onClick={logout} className="mt-3 flex w-full items-center gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-700"><LogOut className="h-4 w-4" /> Déconnexion</button>
          </details>

          <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            {error && <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
            {dashboard && !dashboard.agent.affectation_complete && <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">Votre compte n’est pas encore affecté à une agence et à un guichet. Les ventes resteront classées « Sans agence » jusqu’à l’affectation par l’administrateur compagnie.</div>}
            <Outlet context={{ dashboard, loading, error, refreshDashboard }} />
          </main>
        </div>
      </div>
    </div>
  );
};

export default GuichetLayout;
