import React from 'react';

interface SalesPoint {
  date: string;
  tickets: number;
  revenue: number;
}

const SalesAnalytics: React.FC<{ data?: SalesPoint[] }> = ({ data = [] }) => {
  const maxTickets = Math.max(...data.map((point) => Number(point.tickets || 0)), 0);
  const hasSales = maxTickets > 0;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Ventes des 7 derniers jours</h3>
          <p className="mt-1 text-xs text-slate-500">Billets mobiles et ventes réalisées au guichet.</p>
        </div>
        <div className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">Données réelles</div>
      </div>

      {!hasSales ? (
        <div className="mt-6 flex h-44 items-center justify-center rounded-2xl bg-slate-50 text-sm text-slate-500">
          Aucune vente enregistrée sur cette période.
        </div>
      ) : (
        <div className="mt-6 flex h-48 items-end gap-3" role="img" aria-label="Ventes des sept derniers jours">
          {data.map((point) => {
            const tickets = Number(point.tickets || 0);
            const height = tickets === 0 ? 4 : Math.max(12, Math.round((tickets / maxTickets) * 100));
            const date = new Date(`${point.date}T00:00:00`);
            const label = Number.isNaN(date.getTime())
              ? point.date
              : new Intl.DateTimeFormat('fr-FR', { weekday: 'short' }).format(date);
            return (
              <div key={point.date} className="flex flex-1 flex-col items-center justify-end">
                <div className="mb-2 text-xs font-semibold text-slate-700">{tickets}</div>
                <div
                  className="w-full rounded-t-lg bg-gradient-to-t from-blue-600 to-blue-400"
                  style={{ height: `${height}%` }}
                  title={`${tickets} billet(s) • ${Number(point.revenue || 0).toLocaleString('fr-FR')} FCFA`}
                />
                <div className="mt-2 text-xs capitalize text-slate-400">{label}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SalesAnalytics;
