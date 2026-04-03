import { useEffect, useState } from 'react';
import apiService from './services/api';
import type { ScheduledTrip } from './services/api';
import type { SearchData, BookingData, PaymentData, SearchFormData } from './types';
import { readLocalStorage, writeLocalStorage, removeLocalStorage } from './storage';
import { useAuth } from './contexts/AuthContext';
import { Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import ServerWarmupBanner from './components/ServerWarmupBanner';
import LandingPage from './components/LandingPage';
import AuthPage from './components/AuthPage';
import HomePage from './components/HomePage';
import ResultsPage from './components/ResultsPage';
import BookingPage from './components/BookingPage';
import PaymentPage from './components/PaymentPage';
import ConfirmationPage from './components/ConfirmationPage';
import MyTicketsPage from './components/MyTicketsPage';
import ProfilePage from './components/ProfilePage';
import CompanyDashboard from './components/CompanyDashboard';
import AdminDashboard from './components/AdminDashboard';

type AuthMode = 'login' | 'register';

function App() {
  // NOTE: Ce composant est le point d'entrée de l'application React.
  // Il gère :
  // - la vue courante (landing, auth, home, booking, company-dashboard, admin-dashboard)
  // - le cycle d'authentification (stockage du token, récupération de l'utilisateur via /me/)
  // - la redirection initiale selon le rôle renvoyé par l'API (is_staff, is_company_admin)
  // - la persistance simple de la 'vue' dans localStorage pour restaurer l'état après un reload
  // Si vous migrez vers une architecture plus grosse, il est recommandé de remplacer
  // ce pattern par un contexte d'authentification (AuthContext) et un routeur (react-router).
  // Routing replaces the older `currentView` state; keep minimal state for UI flows
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const { isAuthenticated, logout: authLogout } = useAuth();
  const [searchData, setSearchData] = useState<SearchData | null>(null);
  const [searchResults, setSearchResults] = useState<ScheduledTrip[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<ScheduledTrip | null>(null);
  const [bookingData, setBookingData] = useState<BookingData | null>(null);
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);

  const navigate = useNavigate();

  const handleSearch = async (data: SearchFormData) => {
    // normalize the search data to the TripSearchParams shape
    const normalized = {
      departure_city: data.departure,
      arrival_city: data.arrival,
      travel_date: data.date,
      date: data.date,
      passengers: data.passengers || 1,
    };
    setSearchData(normalized);
    try {
      // Ensure we send city NAMES to the backend search endpoint. Some callers may provide numeric ids.
      let depName = normalized.departure_city;
      let arrName = normalized.arrival_city;
      // if numeric ids provided, resolve to names via API cache
      const isNumeric = (v: any) => (typeof v === 'number') || (typeof v === 'string' && /^\d+$/.test(v));
      if (isNumeric(depName) || isNumeric(arrName)) {
        try {
          const cities = await apiService.getCities();
          if (isNumeric(depName)) {
            const found = cities.find((c:any) => String(c.id) === String(depName));
            if (found) depName = found.name;
          }
          if (isNumeric(arrName)) {
            const found2 = cities.find((c:any) => String(c.id) === String(arrName));
            if (found2) arrName = found2.name;
          }
        } catch (e) {
          // ignore and send original values
        }
      }

      const trips = await apiService.searchScheduledTrips({
        departure_city: depName,
        arrival_city: arrName,
        travel_date: normalized.travel_date,
        passengers: normalized.passengers,
      });
      setSearchResults(trips);
      writeLocalStorage('searchData', normalized);
      writeLocalStorage('searchResults', trips);
      writeLocalStorage('currentView', 'results');
      navigate('/results');
    } catch (error) {
      console.error("Error searching for trips:", error);
      throw error;
    }
  };

  const handleListAllTrips = async () => {
    try {
      const trips = await apiService.getScheduledTrips();
      setSearchResults(trips);
      setSearchData(null);
      try {
        writeLocalStorage('searchResults', trips);
        removeLocalStorage('searchData');
        writeLocalStorage('currentView', 'results');
      } catch (e) {
        // ignore storage errors
      }
      navigate('/results');
    } catch (error) {
      console.error('Erreur lors du chargement des trajets', error);
    }
  };

  // Restore data from localStorage on mount
  useEffect(() => {
    const storedSearchData = readLocalStorage<SearchData>('searchData');
    const storedSearchResults = readLocalStorage<ScheduledTrip[]>('searchResults');
    const storedSelectedTrip = readLocalStorage<ScheduledTrip>('selectedTrip');
    const storedBookingData = readLocalStorage<BookingData>('bookingData');
    const storedPaymentData = readLocalStorage<PaymentData>('paymentData');

    if (storedSearchData) setSearchData(storedSearchData);
    if (storedSearchResults) setSearchResults(storedSearchResults);
    if (storedSelectedTrip?.id) {
      setSelectedTrip(storedSelectedTrip);
    } else if (storedSelectedTrip) {
      removeLocalStorage('selectedTrip');
    }
    if (storedBookingData) setBookingData(storedBookingData);
    if (storedPaymentData) setPaymentData(storedPaymentData);
    // Note: data guards (redirect if data missing) are now handled synchronously
    // in the route elements themselves — no useEffect redirect needed.
  }, []);

  const handleTripSelect = (trip: ScheduledTrip) => {
    setSelectedTrip(trip);
    // If searchData is null (e.g. from "Voir tous les trajets"), create minimal searchData from the trip
    if (!searchData && trip) {
      const minimalSearchData = {
        departure_city: trip.departure_city_name || trip.departure_city_display || '',
        arrival_city: trip.arrival_city_name || trip.arrival_city_display || '',
        travel_date: trip.date || '',
        date: trip.date || '',
        passengers: 1,
      };
      setSearchData(minimalSearchData);
      writeLocalStorage('searchData', minimalSearchData);
    }
    writeLocalStorage('selectedTrip', trip);
    writeLocalStorage('currentView', 'booking');
    navigate('/booking');
  };

  const handleProceedToPayment = (data: BookingData) => {
    setBookingData(data);
    writeLocalStorage('bookingData', data);
    writeLocalStorage('currentView', 'payment');
    navigate('/payment');
  };

  const handlePaymentSuccess = (data: PaymentData) => {
    setPaymentData(data);
    writeLocalStorage('paymentData', data);
    writeLocalStorage('currentView', 'confirmation');
    navigate('/confirmation');
  };

  const handleNewBooking = () => {
    setSearchData(null);
    setSelectedTrip(null);
    setBookingData(null);
    setPaymentData(null);
    removeLocalStorage('searchData', 'searchResults', 'selectedTrip', 'bookingData', 'paymentData');
    writeLocalStorage('currentView', 'home');
    navigate('/');
  };

  const handleLogout = () => {
    authLogout();
    removeLocalStorage('searchData', 'searchResults', 'selectedTrip', 'bookingData', 'paymentData');
    writeLocalStorage('currentView', 'landing');
    navigate('/');
    setSearchData(null);
    setSelectedTrip(null);
    setBookingData(null);
    setPaymentData(null);
  };

  const handleNavigateToAuth = (mode: AuthMode) => {
    setAuthMode(mode);
    writeLocalStorage('currentView', 'auth');
    navigate('/login');
  };

  const handleAuthSuccess = (user?: { is_staff?: boolean; is_company_admin?: boolean }) => {
    // Deprecated: handled by AuthContext. Kept for backward compatibility with children components
    if (user) {
      if (user.is_staff) {
        writeLocalStorage('currentView', 'admin-dashboard');
        navigate('/admin');
        return;
      }
      if (user.is_company_admin) {
        writeLocalStorage('currentView', 'company-dashboard');
        navigate('/company');
        return;
      }
    }
    writeLocalStorage('currentView', 'home');
    navigate('/home');
  };

  // Quick navigation for demonstration
  const showDashboardControls = () => (
    <div className="fixed bottom-4 right-4 flex flex-col space-y-2 z-50">
      <button
        onClick={() => navigate('/')}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow-lg hover:bg-blue-700 transition-colors text-sm"
      >
        Accueil Voyageur
      </button>
      <button
        onClick={() => navigate('/company')}
        className="px-4 py-2 bg-green-600 text-white rounded-lg shadow-lg hover:bg-green-700 transition-colors text-sm"
      >
        Dashboard Compagnie
      </button>
      <button
        onClick={() => navigate('/admin')}
        className="px-4 py-2 bg-red-600 text-white rounded-lg shadow-lg hover:bg-red-700 transition-colors text-sm"
      >
        Dashboard Admin
      </button>
      {isAuthenticated && (
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg shadow-lg hover:bg-gray-700 transition-colors text-sm"
        >
          Déconnexion
        </button>
      )}
    </div>
  );

  return (
      <div className="App">
        <Navbar />
        <ServerWarmupBanner />
        <Routes>
          <Route path="/" element={isAuthenticated ? <Navigate to="/home" replace /> : <LandingPage onNavigateToAuth={handleNavigateToAuth} onNavigateToHome={() => navigate('/')} logoUrl="/logo.jpg" siteTitle="EvexTicket" />} />
          <Route path="/login" element={<AuthPage mode={authMode} onBack={() => navigate('/')} onSuccess={handleAuthSuccess} onSwitchMode={handleNavigateToAuth} logoUrl="/logo.jpg" siteTitle="EvexTicket" />} />
          <Route path="/register" element={<AuthPage mode={'register'} onBack={() => navigate('/')} onSuccess={handleAuthSuccess} onSwitchMode={handleNavigateToAuth} logoUrl="/logo.jpg" siteTitle="EvexTicket" />} />
          <Route path="/home" element={
            <ProtectedRoute allowed={['user', 'company', 'admin']}>
              <HomePage onSearch={handleSearch} isAuthenticated={isAuthenticated} onNavigateToAuth={handleNavigateToAuth} onLogout={handleLogout} onListAllTrips={handleListAllTrips} />
            </ProtectedRoute>
          } />
          <Route path="/results" element={
            <ProtectedRoute allowed={['user', 'company', 'admin']}>
              <ResultsPage searchData={searchData} searchResults={searchResults as any} onBack={() => navigate('/home')} onSelectTrip={handleTripSelect} />
            </ProtectedRoute>
          } />
          <Route path="/booking" element={
            <ProtectedRoute allowed={['user', 'company', 'admin']}>
              {selectedTrip ? (
                <BookingPage trip={selectedTrip} searchData={searchData} onBack={() => navigate('/results')} onProceedToPayment={handleProceedToPayment} />
              ) : (
                <Navigate to="/home" replace />
              )}
            </ProtectedRoute>
          } />
          <Route path="/payment" element={
            <ProtectedRoute allowed={['user', 'company', 'admin']}>
              {bookingData ? (
                <PaymentPage bookingData={bookingData} onBack={() => navigate('/booking')} onPaymentSuccess={handlePaymentSuccess} />
              ) : (
                <Navigate to="/home" replace />
              )}
            </ProtectedRoute>
          } />
          <Route path="/confirmation" element={
            <ProtectedRoute allowed={['user', 'company', 'admin']}>
              {paymentData ? (
                <ConfirmationPage paymentData={paymentData} onNewBooking={handleNewBooking} />
              ) : (
                <Navigate to="/home" replace />
              )}
            </ProtectedRoute>
          } />

          <Route path="/my-tickets" element={
            <ProtectedRoute allowed={['user', 'company', 'admin']}>
              <MyTicketsPage />
            </ProtectedRoute>
          } />

          <Route path="/profile" element={
            <ProtectedRoute allowed={['user', 'company', 'admin']}>
              <ProfilePage />
            </ProtectedRoute>
          } />

          <Route path="/company" element={
            <ProtectedRoute allowed={['company']}>
              <CompanyDashboard logoUrl="/logo.jpg" siteTitle="EvexTicket" />
            </ProtectedRoute>
          } />

          <Route path="/admin" element={
            <ProtectedRoute allowed={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          } />

        </Routes>

      </div>
  );
}

export default App;