import React from 'react';
import { Building2, LogOut } from 'lucide-react';

interface TopbarProps {
  companyName: string;
  companyLogoUrl?: string;
  adminName?: string;
  onLogout?: () => void;
}

const Topbar: React.FC<TopbarProps> = ({ companyName, companyLogoUrl, adminName = 'Administrateur', onLogout }) => {
  const initial = (adminName.trim()[0] || 'A').toUpperCase();

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-slate-200 bg-white/95 px-6 py-4 backdrop-blur">
      <div className="flex min-w-0 items-center gap-3">
        {companyLogoUrl ? (
          <img src={companyLogoUrl} alt={`${companyName || 'Compagnie'} logo`} className="h-10 w-10 rounded-2xl object-cover" />
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
            <Building2 className="h-5 w-5" />
          </div>
        )}
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-slate-900">{companyName || 'Ma compagnie'}</div>
          <div className="text-xs text-slate-500">Espace partenaire EvexTicket</div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden text-right sm:block">
          <div className="text-sm font-semibold text-slate-900">{adminName}</div>
          <div className="text-xs text-slate-500">Administrateur compagnie</div>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 font-semibold text-slate-700">{initial}</div>
        {onLogout && (
          <button type="button" onClick={onLogout} className="inline-flex h-10 w-10 items-center justify-center rounded-2xl text-slate-500 transition hover:bg-red-50 hover:text-red-600 lg:hidden" aria-label="Déconnexion">
            <LogOut className="h-5 w-5" />
          </button>
        )}
      </div>
    </header>
  );
};

export default Topbar;
