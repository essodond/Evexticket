import { useEffect, useState } from 'react';
import apiService from './services/api';
import type { ScheduledTrip } from './services/api';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Routes, Route, useNavigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import LandingPage from './components/LandingPage';
import AuthPage from './components/AuthPage';
import HomePage from './components/HomePage';
import ResultsPage from './components/ResultsPage';
import BookingPage from './components/BookingPage';
import PaymentPage from './components/PaymentPage';
import ConfirmationPage from './components/ConfirmationPage';
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
  const [searchData, setSearchData] = useState<any>(null);
  const [searchResults, setSearchResults] = useState<ScheduledTrip[]>([]); // New state for search results
  const [selectedTrip, setSelectedTrip] = useState<any>(null);
  const [bookingData, setBookingData] = useState<any>(null);
  const [paymentData, setPaymentData] = useState<any>(null);

  const navigate = useNavigate();

  const handleSearch = async (data: any) => {
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
      const trips = await apiService.searchScheduledTrips({
        departure_city: normalized.departure_city,
        arrival_city: normalized.arrival_city,
        travel_date: normalized.travel_date,
        passengers: normalized.passengers,
      });
      console.log("API search results:", trips);
      setSearchResults(trips);
      localStorage.setItem('currentView', 'results');
      navigate('/results');
    } catch (error) {
      console.error("Error searching for trips:", error);
      // Optionally, handle error display to the user
    }
  };

  const handleTripSelect = (trip: any) => {
    setSelectedTrip(trip);
    localStorage.setItem('currentView', 'booking');
    navigate('/booking');
  };

  const handleProceedToPayment = (data: any) => {
    setBookingData(data);
    localStorage.setItem('currentView', 'payment');
    navigate('/payment');
  };

  const handlePaymentSuccess = (data: any) => {
    setPaymentData(data);
    localStorage.setItem('currentView', 'confirmation');
    navigate('/confirmation');
  };

  const handleNewBooking = () => {
    setSearchData(null);
    setSelectedTrip(null);
    setBookingData(null);
    setPaymentData(null);
    localStorage.setItem('currentView', 'home');
    navigate('/');
  };

  const handleNavigateToAuth = (mode: AuthMode) => {
    setAuthMode(mode);
    localStorage.setItem('currentView', 'auth');
    navigate('/login');
  };

  const handleAuthSuccess = (user?: any) => {
    // Deprecated: handled by AuthContext. Kept for backward compatibility with children components
    if (user) {
      if (user.is_staff) {
        localStorage.setItem('currentView', 'admin-dashboard');
        navigate('/admin');
        return;
      }
      if (user.is_company_admin) {
        localStorage.setItem('currentView', 'company-dashboard');
        navigate('/company');
        return;
      }
    }
    localStorage.setItem('currentView', 'home');
    navigate('/home');
  };

  const handleLogout = () => {
    // Delegate to AuthContext logout
    authLogout();
    localStorage.setItem('currentView', 'landing');
    navigate('/');
    setSearchData(null);
    setSelectedTrip(null);
    setBookingData(null);
    setPaymentData(null);
  };

  // App now uses AuthProvider to bootstrap auth state; we keep currentView persistence logic
  useEffect(() => {
    // Restore a preferred view if present in localStorage (used for UX persistence)
    try {
      // We don't set a local state; we use stored `currentView` only for UX persistence elsewhere.
    } catch (e) {
      // ignore
    }
  }, []);

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
    <AuthProvider>
      <div className="App">
        <Routes>
          <Route path="/" element={<LandingPage onNavigateToAuth={handleNavigateToAuth} onNavigateToHome={() => navigate('/')} logoUrl="/logo.jpg" siteTitle="EvexTicket" />} />
          <Route path="/login" element={<AuthPage mode={authMode} onBack={() => navigate('/')} onSuccess={handleAuthSuccess} onSwitchMode={handleNavigateToAuth} logoUrl="/logo.jpg" siteTitle="EvexTicket" />} />
          <Route path="/register" element={<AuthPage mode={'register'} onBack={() => navigate('/')} onSuccess={handleAuthSuccess} onSwitchMode={handleNavigateToAuth} logoUrl="/logo.jpg" siteTitle="EvexTicket" />} />
          <Route path="/home" element={<HomePage onSearch={handleSearch} isAuthenticated={isAuthenticated} onNavigateToAuth={handleNavigateToAuth} onLogout={handleLogout} />} />
          <Route path="/results" element={<ResultsPage searchData={searchData} searchResults={searchResults} onBack={() => navigate('/home')} onSelectTrip={handleTripSelect} />} />
          <Route path="/booking" element={<BookingPage trip={selectedTrip} searchData={searchData} onBack={() => navigate('/results')} onProceedToPayment={handleProceedToPayment} />} />
          <Route path="/payment" element={<PaymentPage bookingData={bookingData} onBack={() => navigate('/booking')} onPaymentSuccess={handlePaymentSuccess} />} />
          <Route path="/confirmation" element={<ConfirmationPage paymentData={paymentData} onNewBooking={handleNewBooking} />} />

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

        {/* {showDashboardControls()} */}
      </div>
    </AuthProvider>
  );
}

export default App;