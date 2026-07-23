import React, { useCallback, useEffect, useState } from 'react';
import { Menu } from 'lucide-react';
import { NavLink, Outlet, useNavigate, useOutletContext } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/api';
import type { Company } from '../services/api';
import { companyNavigationItems } from '../utils/companyNavigation';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

interface CompanyPortalContextValue {
  companyId: number;
  company: Company | null;
  loadingCompany: boolean;
  companyError: string | null;
  refreshCompany: () => Promise<void>;
}

export const useCompanyPortal = () => useOutletContext<CompanyPortalContextValue>();

const CompanyLayout: React.FC = () => {
  const auth = useAuth();
  const navigate = useNavigate();
  const companyId = Number(auth.user?.company_id || 0);
  const [company, setCompany] = useState<Company | null>(null);
  const [loadingCompany, setLoadingCompany] = useState(true);
  const [companyError, setCompanyError] = useState<string | null>(null);

  const refreshCompany = useCallback(async () => {
    if (!companyId) {
      setCompanyError('Aucune compagnie n’est associée à ce compte.');
      setLoadingCompany(false);
      return;
    }
    setLoadingCompany(true);
    try {
      setCompany(await apiService.getCompany(companyId));
      setCompanyError(null);
    } catch (error: any) {
      setCompanyError(error?.message || 'Impossible de charger la compagnie.');
    } finally {
      setLoadingCompany(false);
    }
  }, [companyId]);

  useEffect(() => {
    void refreshCompany();
  }, [refreshCompany]);

  const logout = () => {
    auth.logout();
    navigate('/login', { replace: true });
  };

  const adminName = [auth.user?.first_name, auth.user?.last_name].filter(Boolean).join(' ') || auth.user?.email || 'Administrateur';

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="min-w-0 flex-1">
          <Topbar companyName={company?.name || 'Ma compagnie'} companyLogoUrl={company?.logo || undefined} adminName={adminName} onLogout={logout} />

          <details className="border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
            <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-slate-700">
              <Menu className="h-4 w-4" />
              Menu de gestion
            </summary>
            <nav className="mt-3 grid gap-2 sm:grid-cols-2" aria-label="Navigation compagnie mobile">
              {companyNavigationItems.map((item) => (
                <NavLink
                  key={item.key}
                  to={item.path}
                  className={({ isActive }) => `rounded-xl px-3 py-2.5 text-sm font-medium ${
                    isActive ? 'bg-blue-50 text-blue-700' : 'bg-slate-50 text-slate-600'
                  }`}
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </details>

          <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            {companyError && (
              <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {companyError}
              </div>
            )}
            <Outlet context={{ companyId, company, loadingCompany, companyError, refreshCompany }} />
          </main>
        </div>
      </div>
    </div>
  );
};

export default CompanyLayout;
