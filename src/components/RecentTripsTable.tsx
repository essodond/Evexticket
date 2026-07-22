import React from 'react';
import { MapPin } from 'lucide-react';

const RecentTripsTable: React.FC<{ trips: any[] }> = ({ trips }) => {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border">
      <h3 className="text-sm font-semibold mb-4">Voyages récents</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="bg-gray-50/80">
              <th className="px-4 py-2 text-left text-xs text-gray-500">Trajet</th>
              <th className="px-4 py-2 text-left text-xs text-gray-500">Date</th>
              <th className="px-4 py-2 text-left text-xs text-gray-500">Heure départ</th>
              <th className="px-4 py-2 text-left text-xs text-gray-500">Bus</th>
              <th className="px-4 py-2 text-left text-xs text-gray-500">Places</th>
              <th className="px-4 py-2 text-right text-xs text-gray-500">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {trips.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Aucun voyage récent</td></tr>
            ) : (
              trips.map((t:any) => (
                <tr key={t.scheduled_trip_id ?? t.id} className="hover:bg-blue-50/30">
                  <td className="px-4 py-3"><div className="flex items-center gap-2"><div className="w-8 h-8 rounded bg-blue-50 flex items-center justify-center"><MapPin size={14} className="text-blue-600"/></div>{t.departure_city_name} → {t.arrival_city_name}</div></td>
                  <td className="px-4 py-3 text-sm text-gray-600">{t.date}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{t.departure_time}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{t.bus_type || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{t.available_seats ?? 0} places</td>
                  <td className="px-4 py-3 text-right"><span className="inline-flex items-center text-xs font-semibold px-2 py-1 rounded-full bg-emerald-50 text-emerald-700">Actif</span></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RecentTripsTable;
