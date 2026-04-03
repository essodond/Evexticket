import React, { useState, useMemo } from 'react';
import { ArrowLeft, Clock, Users, ArrowRight } from 'lucide-react';
import { Trip, TripSearchParams } from '../services/api';

interface ResultsPageProps {
  searchData: TripSearchParams;
  searchResults: Trip[];
  onBack: () => void;
  onSelectTrip: (trip: Trip) => void;
  searchLoading?: boolean;
}

const ResultsPage: React.FC<ResultsPageProps> = ({ searchData, searchResults, onBack, onSelectTrip, searchLoading = false }) => {
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'price_asc' | 'price_desc' | 'time_asc'>('time_asc');

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return String(dateStr);
      return d.toLocaleDateString('fr-FR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (e) {
      return String(dateStr);
    }
  };

  const formatTime = (timeStr?: string) => {
    if (!timeStr) return '';
    const simpleTime = /^\d{2}:\d{2}(:\d{2})?$/;
    if (simpleTime.test(timeStr)) {
      const [h, m] = timeStr.split(':');
      return `${h}:${m}`;
    }
    try {
      const d = new Date(timeStr);
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
    } catch {}
    return String(timeStr);
  };

  const companies = useMemo(() => {
    const map = new Map<string, { name: string }>();
    for (const t of searchResults) {
      if (t.company_name) map.set(t.company_name, { name: t.company_name });
    }
    return Array.from(map.values());
  }, [searchResults]);

  const filteredAndSorted = useMemo(() => {
    let trips = selectedCompany
      ? searchResults.filter(t => t.company_name === selectedCompany)
      : [...searchResults];

    if (sortBy === 'price_asc') {
      trips.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
    } else if (sortBy === 'price_desc') {
      trips.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
    } else {
      trips.sort((a, b) => (a.departure_time || '').localeCompare(b.departure_time || ''));
    }
    return trips;
  }, [searchResults, selectedCompany, sortBy]);

  if (searchLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center text-gray-600">Chargement des trajets...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={onBack}
              className="flex items-center text-gray-600 hover:text-blue-600 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Retour
            </button>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">EV</span>
              </div>
              <span className="text-xl font-bold text-gray-900">EVEX</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Summary */}
        {searchData && (
          <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center space-x-4">
                <div className="text-center">
                  <div className="text-lg font-semibold text-gray-900">{searchData.departure_city}</div>
                  <div className="text-sm text-gray-500">Départ</div>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400" />
                <div className="text-center">
                  <div className="text-lg font-semibold text-gray-900">{searchData.arrival_city}</div>
                  <div className="text-sm text-gray-500">Arrivée</div>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400" />
                <div className="text-center">
                  <div className="text-lg font-semibold text-gray-900">{formatDate(searchData.travel_date)}</div>
                  <div className="text-sm text-gray-500">Date</div>
                </div>
              </div>
              <button onClick={onBack} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                Modifier
              </button>
            </div>
          </div>
        )}

        {/* Filters & company pills */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as typeof sortBy)}
            className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm"
          >
            <option value="time_asc">Heure de départ</option>
            <option value="price_asc">Prix croissant</option>
            <option value="price_desc">Prix décroissant</option>
          </select>

          {/* Company filter pills — visible only when multiple companies */}
          {companies.length > 1 && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCompany(null)}
                className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                  !selectedCompany
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                }`}
              >
                Toutes ({searchResults.length})
              </button>
              {companies.map(c => (
                <button
                  key={c.name}
                  onClick={() => setSelectedCompany(c.name === selectedCompany ? null : c.name)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    selectedCompany === c.name
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}

          <span className="text-sm text-gray-500 ml-auto">{filteredAndSorted.length} trajet(s)</span>
        </div>

        {/* Trip Results */}
        <div className="space-y-4">
          {filteredAndSorted.length > 0 ? (
            filteredAndSorted.map((trip) => (
              <div key={trip.id} className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    {/* Company */}
                    <div className="flex items-start space-x-4">
                      <div className="w-14 h-14 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                        <span className="text-blue-600 font-bold text-sm">{trip.company_name?.substring(0, 2) ?? ''}</span>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{trip.company_name}</h3>
                        <span className="text-xs text-gray-500 capitalize">{trip.bus_type}</span>
                      </div>
                    </div>

                    {/* Time & Duration */}
                    <div className="flex items-center space-x-4">
                      <div className="text-center">
                        <div className="text-xl font-bold text-gray-900">{formatTime(trip.departure_time)}</div>
                        <div className="text-sm text-gray-500">{trip.departure_city_display || trip.departure_city_name}</div>
                      </div>
                      <div className="flex flex-col items-center px-3">
                        <Clock className="w-4 h-4 text-gray-400 mb-1" />
                        <span className="text-sm text-gray-500">{trip.duration} min</span>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-gray-900">{formatTime(trip.arrival_time)}</div>
                        <div className="text-sm text-gray-500">{trip.arrival_city_display || trip.arrival_city_name}</div>
                      </div>
                    </div>

                    {/* Seats & Price */}
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <div className="flex items-center text-gray-600 mb-1">
                          <Users className="w-4 h-4 mr-1" />
                          <span className="text-sm font-medium">{trip.available_seats}</span>
                        </div>
                        <div className="text-xs text-gray-500">sur {trip.capacity}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-green-600">
                          {(() => {
                            const p = typeof trip.price === 'number' ? trip.price : parseFloat(String(trip.price));
                            return isNaN(p) ? '' : p.toLocaleString('fr-FR');
                          })()} CFA
                        </div>
                        <button
                          onClick={() => onSelectTrip(trip)}
                          className="mt-2 px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors text-sm"
                        >
                          Choisir
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-gray-500 text-lg py-16">
              Aucun trajet trouvé pour votre recherche.
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ResultsPage;
