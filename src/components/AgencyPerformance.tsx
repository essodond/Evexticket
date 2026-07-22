import React from 'react';

interface AgentPerformance {
  id?: number | string;
  name: string;
  tickets: number;
  revenue?: number;
  active?: boolean;
}

const AgencyPerformance: React.FC<{ agencies?: AgentPerformance[] }> = ({ agencies = [] }) => {
  const max = Math.max(...agencies.map((item) => Number(item.tickets || 0)), 1);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900">Performance des guichets</h3>
      <p className="mt-1 text-xs text-slate-500">Classement selon les billets vendus.</p>

      {agencies.length === 0 ? (
        <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
          Aucune vente guichet enregistrée.
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {agencies.map((agency, index) => (
            <div key={agency.id ?? `${agency.name}-${index}`}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-slate-900">{agency.name}</div>
                  <div className="text-xs text-slate-500">
                    {agency.tickets} billet{agency.tickets > 1 ? 's' : ''}
                    {agency.revenue !== undefined ? ` • ${Number(agency.revenue).toLocaleString('fr-FR')} FCFA` : ''}
                  </div>
                </div>
                <span className={`h-2.5 w-2.5 rounded-full ${agency.active ? 'bg-emerald-500' : 'bg-slate-300'}`} title={agency.active ? 'Actif' : 'Désactivé'} />
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-blue-600" style={{ width: `${Math.round((agency.tickets / max) * 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AgencyPerformance;
