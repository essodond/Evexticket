import React, { useState } from 'react';
// HOME PAGE
// Page d'accueil pour les voyageurs : formulaire de recherche de trajets.
// Elle stocke et récupère quelques informations (username) depuis localStorage
// pour afficher un avatar ou état de connexion simple.
import { Search, MapPin, Calendar, ArrowRight } from 'lucide-react';
// import { useCities } from '../hooks/useApi'; // Commented out

interface HomePageProps {
  onSearch: (searchData: any) => void;
  isAuthenticated?: boolean;
  onNavigateToAuth?: (mode: 'login' | 'register') => void;
  onLogout?: () => void;
  onListAllTrips?: () => void;
}

const HomePage: React.FC<HomePageProps> = ({ onSearch, isAuthenticated = false, onNavigateToAuth, onLogout, onListAllTrips }) => {
  const [departure, setDeparture] = useState('');
  const [arrival, setArrival] = useState('');
  const [date, setDate] = useState('');
  const [username, setUsername] = useState<string | null>(null);

  // const { cities: apiCities, loading: citiesLoading } = useCities(); // Commented out
  const cities = ['Lomé', 'Sokodé', 'Kara', 'Atakpamé', 'Kpalimé', 'Dapaong', 'Tsévié', 'Aného']; // Hardcoded cities
  const citiesLoading = false; // Set loading to false

  // load username from localStorage for avatar initial
  React.useEffect(() => {
    try {
      const u = typeof localStorage !== 'undefined' ? localStorage.getItem('username') : null;
      setUsername(u);
    } catch (e) {
      setUsername(null);
    }
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (departure && arrival && date) {
      onSearch({ departure, arrival, date });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-blue-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <img src="/logo.jpg" alt="EvexTicket" className="w-14 h-14 rounded-xl object-cover shadow-md" />
              <span className="text-3xl font-extrabold text-gray-900 tracking-tight">EvexTicket</span>
            </div>
            <nav className="hidden md:flex items-center space-x-8">
              <a href="#" className="text-gray-600 hover:text-blue-600 transition-colors">Mes Réservations</a>
              <a href="#" className="text-gray-600 hover:text-blue-600 transition-colors">Aide</a>
              {isAuthenticated ? (
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
                    {username ? username.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <button onClick={() => onLogout && onLogout()} className="text-gray-600 hover:text-red-600 transition-colors text-sm">
                    Déconnexion
                  </button>
                </div>
              ) : (
                <button onClick={() => onNavigateToAuth && onNavigateToAuth('login')} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                  Connexion
                </button>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Voyagez à travers le <span className="text-green-600">Togo</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Réservez votre billet de bus en ligne et voyagez confortablement vers votre destination
          </p>
        </div>

        {/* Search Form */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-blue-100">
            <form onSubmit={handleSearch} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Departure */}
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ville de départ
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-blue-500" />
                    <select 
                      value={departure}
                      onChange={(e) => setDeparture(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                        <option value="">{citiesLoading ? 'Chargement...' : 'Sélectionnez une ville'}</option>
                        {!citiesLoading && cities.map(city => (
                          <option key={city} value={city}>{city}</option>
                        ))}
                    </select>
                  </div>
                </div>

                {/* Arrival */}
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ville d'arrivée
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-green-500" />
                    <select 
                      value={arrival}
                      onChange={(e) => setArrival(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="">{citiesLoading ? 'Chargement...' : 'Sélectionnez une ville'}</option>
                      {!citiesLoading && cities.filter((city:any) => city !== departure).map(city => (
                        <option key={city} value={city}>{city}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Date */}
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date de départ
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-blue-500" />
                      <input 
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Search & List Buttons */}
              <div className="flex items-center justify-center gap-4">
                <button 
                  type="submit"
                  className="inline-flex items-center px-8 py-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
                >
                  <Search className="w-5 h-5 mr-2" />
                  Rechercher
                  <ArrowRight className="w-5 h-5 ml-2" />
                </button>
                <button
                  type="button"
                  onClick={() => onListAllTrips && onListAllTrips()}
                  className="inline-flex items-center px-6 py-4 bg-white text-blue-600 border border-blue-200 font-semibold rounded-lg hover:bg-blue-50 transition-colors shadow-sm"
                >
                  Voir tous les trajets disponibles
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
          <div className="text-center p-6 bg-white rounded-xl shadow-md border border-blue-100">
            <div className="w-12 h-12 bg-blue-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
              <Search className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Recherche Facile</h3>
            <p className="text-gray-600">Trouvez rapidement les meilleurs trajets selon vos critères</p>
          </div>
          
          <div className="text-center p-6 bg-white rounded-xl shadow-md border border-green-100">
            <div className="w-12 h-12 bg-green-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
              <MapPin className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Tout le Togo</h3>
            <p className="text-gray-600">Voyagez vers toutes les grandes villes du pays</p>
          </div>
          
          <div className="text-center p-6 bg-white rounded-xl shadow-md border border-blue-100">
            <div className="w-12 h-12 bg-blue-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Réservation Instantanée</h3>
            <p className="text-gray-600">Confirmez votre place en quelques clics</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default HomePage;