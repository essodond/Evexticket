import { ArrowLeft, Clock, Users, ArrowRight } from 'lucide-react';
import { Trip, TripSearchParams } from '../services/api';
import { useState, useMemo } from 'react';

interface ResultsPageProps {
  searchData: TripSearchParams; // Use TripSearchParams for searchData
  searchResults: Trip[]; // actual search results from API
  onBack: () => void;
  onSelectTrip: (trip: Trip) => void;
}

const ResultsPage: React.FC<ResultsPageProps> = ({ searchData, searchResults, onBack, onSelectTrip }) => {
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Extraire la liste unique des compagnies depuis les résultats
  const companies = useMemo(() => {
    const map = new Map<string, { name: string }>();
    for (const t of searchResults) {
      if (t.company_name) map.set(t.company_name, { name: t.company_name });
    }
    return Array.from(map.values());
  }, [searchResults]);

  // Trajets filtrés par compagnie sélectionnée
  const filteredTrips = selectedCompany ? searchResults.filter(t => t.company_name === selectedCompany) : searchResults;

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
                <span className="text-white font-bold text-sm">TB</span>
              </div>
              <span className="text-xl font-bold text-gray-900">TogoBus</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Summary */}
        {searchData && (
          <>
            <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
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
                    <div className="text-lg font-semibold text-gray-900">{searchData.travel_date}</div>
                    <div className="text-sm text-gray-500">Date</div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400" />
                  <div className="text-center">
                    <div className="text-lg font-semibold text-gray-900">{searchData.passengers}</div>
                    <div className="text-sm text-gray-500">Passagers</div>
                  </div>
                </div>
              </div>
              <Button onClick={handleModifySearch} className="px-6 py-2">
                Modifier la recherche
              </Button>
            </div>
            <div className="text-center mt-4">
              <div className="text-lg font-semibold text-gray-900">{formatDate(searchData.travel_date)}</div>
              <div className="text-sm text-gray-500">{searchResults.length} trajets trouvés</div>
            </div>
          </>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-8">
          <select className="px-4 py-2 border border-gray-300 rounded-lg bg-white">
            <option>Trier par prix</option>
            <option>Prix croissant</option>
            <option>Prix décroissant</option>
          </select>
          <select className="px-4 py-2 border border-gray-300 rounded-lg bg-white">
            <option>Heure de départ</option>
            <option>Matin (6h-12h)</option>
            <option>Après-midi (12h-18h)</option>
            <option>Soir (18h-24h)</option>
          </select>
          <div className="px-4 py-2 border border-gray-300 rounded-lg bg-white">
            <span className="text-sm text-gray-600">Compagnies: {companies.length}</span>
          </div>
        </div>

        {/* Étape 1 : afficher les compagnies */}
        {!selectedCompany && (
          <div className="mb-8">
            <h2 className="text-lg font-bold mb-4">Choisissez une compagnie</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {companies.map(c => (
                <button key={c.name} onClick={() => setSelectedCompany(c.name)} className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 flex flex-col items-center hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-2">
                    <span className="text-blue-600 font-bold text-lg">{c.name.substring(0,2)}</span>
                  </div>
                  <span className="text-lg font-semibold text-gray-900">{c.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Trip Results */}
        <div className="space-y-6">
          {filteredTrips.length > 0 ? (
            filteredTrips.map((trip) => (
              <div key={trip.id} className="bg-white rounded-xl shadow-md border border-gray-100 hover:shadow-lg transition-shadow">
                <div className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    {/* Company & Rating */}
                    <div className="flex items-start space-x-4">
                      <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center">
                        <span className="text-blue-600 font-bold text-sm">{trip.company_name.substring(0, 2)}</span>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{trip.company_name}</h3>
                        <div className="flex items-center mt-1">
                          {/* Rating is not available in Trip interface, so we can remove or mock it */}
                          {/* <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm text-gray-600 ml-1">{trip.rating}</span> */}
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {/* Amenities are not available in Trip interface */}
                          {/* {trip.amenities.map((amenity) => (
                            <span key={amenity} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                              {amenity}
                            </span>
                          ))} */}
                        </div>
                      </div>
                    </div>

                    {/* Time & Duration */}
                    <div className="flex items-center space-x-4">
                      <div className="text-center">
                        <div className="text-xl font-bold text-gray-900">{new Date(trip.departure_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        <div className="text-sm text-gray-500">{trip.departure_city_name}</div>
                      </div>
                      <div className="flex flex-col items-center px-4">
                        <Clock className="w-4 h-4 text-gray-400 mb-1" />
                        <span className="text-sm text-gray-500">{trip.duration} min</span>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-gray-900">{new Date(trip.arrival_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        <div className="text-sm text-gray-500">{trip.arrival_city_name}</div>
                      </div>
                    </div>

                    {/* Seats & Price */}
                    <div className="flex items-center space-x-6">
                      <div className="text-center">
                        <div className="flex items-center text-gray-600 mb-1">
                          <Users className="w-4 h-4 mr-1" />
                          <span className="text-sm">{trip.available_seats} places</span>
                        </div>
                        <div className="text-xs text-gray-500">sur {trip.capacity}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-green-600">
                          {trip.price.toLocaleString()} CFA
                        </div>
                        <button
                          onClick={() => onSelectTrip(trip)}
                          className="w-full mt-2 px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
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
            <div className="text-center text-gray-600 text-lg py-10">
              Aucun trajet trouvé pour votre recherche.
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ResultsPage;