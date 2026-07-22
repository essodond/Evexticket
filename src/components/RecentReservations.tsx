import React from 'react';

const RecentReservations: React.FC<{ reservations?: any[] }> = ({ reservations = [] }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <h3 className="text-sm font-semibold text-slate-900">Ventes récentes</h3>
    <p className="mt-1 text-xs text-slate-500">Réservations mobiles et ventes guichet.</p>

    {reservations.length === 0 ? (
      <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
        Aucune vente enregistrée pour le moment.
      </div>
    ) : (
      <div className="mt-4 space-y-3">
        {reservations.slice(0, 6).map((reservation, index) => {
          const route = reservation.trip_details
            ? `${reservation.trip_details.departure_city_name} → ${reservation.trip_details.arrival_city_name}`
            : reservation.route || 'Trajet non renseigné';
          const source = reservation.source === 'guichet' ? 'Guichet' : 'Mobile';
          const rawDate = reservation.booking_date || reservation.created_at || reservation.travel_date;
          const parsedDate = rawDate ? new Date(rawDate) : null;
          const displayDate = parsedDate && !Number.isNaN(parsedDate.getTime())
            ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(parsedDate)
            : 'Date indisponible';
          const status = String(reservation.status || 'confirmé').replace(/_/g, ' ');

          return (
            <div key={`${reservation.id || 'vente'}-${index}`} className="rounded-2xl border border-slate-100 px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-slate-900">{reservation.passenger_name || reservation.name || 'Client'}</div>
                  <div className="mt-1 truncate text-xs text-slate-500">{route}</div>
                  <div className="mt-1 text-xs text-slate-400">{displayDate}</div>
                </div>
                <div className="text-right">
                  <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ${
                    source === 'Guichet' ? 'bg-blue-50 text-blue-700' : 'bg-violet-50 text-violet-700'
                  }`}>
                    {source}
                  </span>
                  <div className="mt-2 text-[11px] capitalize text-slate-500">{status}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    )}
  </div>
);

export default RecentReservations;
