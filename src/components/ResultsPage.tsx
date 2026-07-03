import React, { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Clock, RotateCcw, SearchX, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ScheduledTrip, TripSearchParams } from '../services/api';

interface ResultsPageProps {
  searchData: TripSearchParams | null;
  searchResults: ScheduledTrip[];
  allTripsDate?: string | null;
  onBack: () => void;
  onSelectTrip: (trip: ScheduledTrip) => void;
  searchLoading?: boolean;
}

const BOOKING_CLOSED_MESSAGE =
  'Les réservations sont fermées pour ce trajet car le départ est imminent.';

const ResultsPage: React.FC<ResultsPageProps> = ({
  searchData,
  searchResults,
  allTripsDate,
  onBack,
  onSelectTrip,
  searchLoading = false,
}) => {
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'price_asc' | 'price_desc' | 'time_asc'>('time_asc');
  const navigate = useNavigate();

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return String(dateStr);
      return date.toLocaleDateString('fr-FR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch (error) {
      return String(dateStr);
    }
  };

  const formatTime = (timeStr?: string) => {
    if (!timeStr) return '';
    const simpleTime = /^\d{2}:\d{2}(:\d{2})?$/;
    if (simpleTime.test(timeStr)) {
      const [hours, minutes] = timeStr.split(':');
      return `${hours}:${minutes}`;
    }
    try {
      const date = new Date(timeStr);
      if (!isNaN(date.getTime())) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
    } catch {}
    return String(timeStr);
  };

  const companies = useMemo(() => {
    const map = new Map<string, { name: string }>();
    for (const trip of searchResults) {
      if (trip.company_name) map.set(trip.company_name, { name: trip.company_name });
    }
    return Array.from(map.values());
  }, [searchResults]);

  const filteredAndSorted = useMemo(() => {
    const trips = selectedCompany
      ? searchResults.filter((trip) => trip.company_name === selectedCompany)
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

  const getBadgeClasses = (badgeLabel?: string | null) => {
    switch (badgeLabel) {
      case 'Départ imminent':
        return 'bg-orange-100 text-orange-700 ring-1 ring-orange-200';
      case 'Dernières places':
        return 'bg-yellow-100 text-yellow-700 ring-1 ring-yellow-200';
      case 'Complet':
        return 'bg-red-100 text-red-700 ring-1 ring-red-200';
      default:
        return 'bg-slate-100 text-slate-700 ring-1 ring-slate-200';
    }
  };

  const isTripUnavailable = (trip: ScheduledTrip) =>
    trip.booking_closed || trip.badge_label === 'Complet';

  if (searchLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center text-gray-600">Chargement des trajets...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fbff_0%,#f3f7ff_45%,#eef4ff_100%)]">
      <header className="border-b border-white/70 bg-white/80 shadow-sm backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <button
              onClick={onBack}
              className="flex items-center text-gray-600 transition-colors hover:text-blue-600"
            >
              <ArrowLeft className="mr-2 h-5 w-5" />
              Retour
            </button>
            <div className="flex items-center space-x-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
                <span className="text-sm font-bold text-white">EV</span>
              </div>
              <span className="text-xl font-bold text-gray-900">EVEX</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {searchData && (
          <div className="mb-6 rounded-[28px] border border-white/70 bg-white/85 p-4 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.35)] backdrop-blur-xl sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center space-x-4">
                <div className="text-center">
                  <div className="text-lg font-semibold text-gray-900">{searchData.departure_city}</div>
                  <div className="text-sm text-gray-500">Départ</div>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400" />
                <div className="text-center">
                  <div className="text-lg font-semibold text-gray-900">{searchData.arrival_city}</div>
                  <div className="text-sm text-gray-500">Arrivée</div>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400" />
                <div className="text-center">
                  <div className="text-lg font-semibold text-gray-900">
                    {formatDate(searchData.travel_date)}
                  </div>
                  <div className="text-sm text-gray-500">Date</div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={onBack}
                  className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
                >
                  Modifier
                </button>
                <button
                  onClick={() => navigate('/')}
                  className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-all hover:border-blue-200 hover:text-blue-600"
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Réinitialiser la recherche
                </button>
              </div>
            </div>
          </div>
        )}

        {!searchData && allTripsDate && (
          <div className="mb-6 rounded-[28px] border border-blue-100 bg-blue-50/80 p-4 text-sm text-blue-900 shadow-sm">
            <div className="font-semibold">Trajets disponibles pour</div>
            <div className="mt-1 text-lg font-bold text-slate-900">{formatDate(allTripsDate)}</div>
            <div className="mt-2 text-slate-600">Affichage des trajets d'aujourd'hui ou du prochain jour disponible.</div>
          </div>
        )}

        <div className="mb-6 flex flex-wrap items-center gap-3">
          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value as typeof sortBy)}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm outline-none transition-colors focus:border-blue-300"
          >
            <option value="time_asc">Heure de départ</option>
            <option value="price_asc">Prix croissant</option>
            <option value="price_desc">Prix décroissant</option>
          </select>

          {companies.length > 1 && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCompany(null)}
                className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                  !selectedCompany
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : 'border-slate-200 bg-white text-gray-700 hover:border-blue-300'
                }`}
              >
                Toutes ({searchResults.length})
              </button>
              {companies.map((company) => (
                <button
                  key={company.name}
                  onClick={() =>
                    setSelectedCompany(company.name === selectedCompany ? null : company.name)
                  }
                  className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                    selectedCompany === company.name
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-slate-200 bg-white text-gray-700 hover:border-blue-300'
                  }`}
                >
                  {company.name}
                </button>
              ))}
            </div>
          )}

          <div className="ml-auto flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-all hover:border-blue-200 hover:text-blue-600"
            >
              Voir tous les trajets
            </button>
            <span className="text-sm text-gray-500">{filteredAndSorted.length} trajet(s)</span>
          </div>
        </div>

        <div className="space-y-4">
          {filteredAndSorted.length > 0 ? (
            filteredAndSorted.map((trip) => (
              <div
                key={`${trip.id}-${trip.scheduled_trip_id ?? trip.date ?? trip.departure_time}`}
                className="overflow-hidden rounded-[28px] border border-white/70 bg-white/85 shadow-[0_18px_45px_-28px_rgba(15,23,42,0.28)] backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:shadow-[0_24px_50px_-28px_rgba(37,99,235,0.35)]"
              >
                <div className="p-6">
                  <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
                    <div className="flex items-start space-x-4">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-100 via-sky-100 to-cyan-100">
                        <span className="text-sm font-bold text-blue-600">
                          {trip.company_name?.substring(0, 2) ?? ''}
                        </span>
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold text-gray-900">{trip.company_name}</h3>
                          {trip.badge_label && (
                            <span
                              className={`rounded-full px-2 py-1 text-xs font-medium ${getBadgeClasses(trip.badge_label)}`}
                            >
                              {trip.badge_label}
                            </span>
                          )}
                        </div>
                        <span className="text-xs capitalize text-gray-500">{trip.bus_type}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="text-center">
                        <div className="text-xl font-bold text-gray-900">
                          {formatTime(trip.departure_time)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {trip.departure_city_display || trip.departure_city_name}
                        </div>
                      </div>
                      <div className="flex flex-col items-center px-3">
                        <Clock className="mb-1 h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-500">{trip.duration} min</span>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-gray-900">
                          {formatTime(trip.arrival_time)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {trip.arrival_city_display || trip.arrival_city_name}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <div className="mb-1 flex items-center text-gray-600">
                          <Users className="mr-1 h-4 w-4" />
                          <span className="text-sm font-medium">{trip.available_seats}</span>
                        </div>
                        <div className="text-xs text-gray-500">sur {trip.capacity}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-green-600">
                          {(() => {
                            const price =
                              typeof trip.price === 'number'
                                ? trip.price
                                : parseFloat(String(trip.price));
                            return isNaN(price) ? '' : price.toLocaleString('fr-FR');
                          })()}{' '}
                          CFA
                        </div>
                        {trip.booking_closed && (
                          <p className="mt-2 max-w-xs text-xs leading-5 text-orange-600">
                            {BOOKING_CLOSED_MESSAGE}
                          </p>
                        )}
                        <button
                          onClick={() => onSelectTrip(trip)}
                          disabled={isTripUnavailable(trip)}
                          className={`mt-3 rounded-full px-6 py-2 text-sm font-medium transition-all ${
                            isTripUnavailable(trip)
                              ? 'cursor-not-allowed bg-slate-200 text-slate-500'
                              : 'bg-blue-600 text-white shadow-sm hover:bg-blue-700'
                          }`}
                        >
                          {trip.badge_label === 'Complet'
                            ? 'Complet'
                            : trip.booking_closed
                              ? 'Réservations fermées'
                              : 'Choisir'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-[32px] border border-dashed border-slate-200 bg-white/80 px-6 py-16 text-center shadow-[0_18px_45px_-30px_rgba(15,23,42,0.25)] backdrop-blur-xl">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                <SearchX className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900">
                Aucun trajet trouvé pour cette recherche
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                Essayez une autre date ou revenez à la liste complète des trajets disponibles.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={onBack}
                  className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-blue-600"
                >
                  Modifier la recherche
                </button>
                <button
                  onClick={() => navigate('/')}
                  className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
                >
                  Voir tous les trajets disponibles
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ResultsPage;