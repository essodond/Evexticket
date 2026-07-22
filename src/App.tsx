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
import CompanyLayout from './components/CompanyLayout';
import {
  CompanyAgenciesPage,
  CompanyAgencyDetailPage,
  CompanyBusesPage,
  CompanyPersonnelPage,
  CompanyProfilePage,
  CompanyRevenuePage,
  CompanyRoutesPage,
  CompanySettingsPage,
  CompanyTicketsPage,
  CompanyVoyageDetailPage,
  CompanyVoyagesPage,
} from './components/company/CompanyPages';
import AdminLayout from './components/AdminLayout';
import { AdminDashboardPage, AdminCompaniesPage, AdminCompanyDetailPage, AdminUsersPage, AdminVoyagesPage, AdminTicketsPage, AdminFinancePage, AdminAnalyticsPage, AdminAuditPage, AdminSettingsPage } from './components/admin/AdminPages';
import GuichetLayout from './components/guichet/GuichetLayout';
import {
  GuichetHistoryPage,
  GuichetHomePage,
  GuichetSalePage,
  GuichetScannerPage,
  GuichetTripsPage,
} from './components/guichet/GuichetPages';
import { getAuthenticatedHomePath, getPortalFromHostname } from './utils/portal';
import type { AuthPortal } from './contexts/AuthContext';

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
  const { isAuthenticated, user: authenticatedUser, logout: authLogout } = useAuth();
  const [searchData, setSearchData] = useState<SearchData | null>(null);
  const [searchResults, setSearchResults] = useState<ScheduledTrip[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<ScheduledTrip | null>(null);
  const [bookingData, setBookingData] = useState<BookingData | null>(null);
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [allTripsDate, setAllTripsDate] = useState<string | null>(null);

  const navigate = useNavigate();
  const currentPortal = getPortalFromHostname(typeof window !== 'undefined' ? window.location.hostname : undefined) as AuthPortal;

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
      const normalizeDay = (date: Date) => {
        const copy = new Date(date);
        copy.setHours(0, 0, 0, 0);
        return copy;
      };

      const today = normalizeDay(new Date());
      const tomorrow = normalizeDay(new Date(today));
      tomorrow.setDate(tomorrow.getDate() + 1);

      const upcoming = trips.filter((trip) => {
        if (!trip.date) return false;
        const tripDate = normalizeDay(new Date(trip.date));
        return tripDate >= today;
      });

      const todayTrips = upcoming.filter((trip) => {
        const tripDate = normalizeDay(new Date(trip.date));
        return tripDate.getTime() === today.getTime();
      });
      const tomorrowTrips = upcoming.filter((trip) => {
        const tripDate = normalizeDay(new Date(trip.date));
        return tripDate.getTime() === tomorrow.getTime();
      });

      let filteredTrips = todayTrips;
      let selectedDate = today;
      if (todayTrips.length === 0) {
        filteredTrips = tomorrowTrips;
        selectedDate = tomorrow;
      }
      if (filteredTrips.length === 0 && upcoming.length > 0) {
        filteredTrips = upcoming;
        selectedDate = normalizeDay(new Date(upcoming[0].date));
      }

      const selectedDateIso = filteredTrips.length > 0 ? selectedDate.toISOString().slice(0, 10) : null;

      setSearchResults(filteredTrips);
      setSearchData(null);
      setAllTripsDate(selectedDateIso);
      try {
        writeLocalStorage('searchResults', filteredTrips);
        writeLocalStorage('allTripsDate', selectedDateIso);
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
    const storedAllTripsDate = readLocalStorage<string>('allTripsDate');

    if (storedSearchData) setSearchData(storedSearchData);
    if (storedSearchResults) setSearchResults(storedSearchResults);
    if (storedSelectedTrip?.id) {
      setSelectedTrip(storedSelectedTrip);
    } else if (storedSelectedTrip) {
      removeLocalStorage('selectedTrip');
    }
    if (storedBookingData) setBookingData(storedBookingData);
    if (storedPaymentData) setPaymentData(storedPaymentData);
    if (storedAllTripsDate) setAllTripsDate(storedAllTripsDate);
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
    setAllTripsDate(null);
    removeLocalStorage('searchData', 'searchResults', 'selectedTrip', 'bookingData', 'paymentData', 'allTripsDate');
    writeLocalStorage('currentView', 'home');
    navigate('/');
  };

  const handleLogout = () => {
    authLogout();
    removeLocalStorage('searchData', 'searchResults', 'selectedTrip', 'bookingData', 'paymentData', 'allTripsDate');
    writeLocalStorage('currentView', 'landing');
    navigate('/');
    setSearchData(null);
    setSelectedTrip(null);
    setBookingData(null);
    setPaymentData(null);
    setAllTripsDate(null);
  };

  const handleNavigateToAuth = (mode: AuthMode) => {
    setAuthMode(mode);
    writeLocalStorage('currentView', 'auth');
    navigate('/login');
  };

  const handleAuthSuccess = (user?: { is_staff?: boolean; is_superuser?: boolean; is_company_admin?: boolean; is_guichet_agent?: boolean }) => {
    const destination = getAuthenticatedHomePath(user);
    writeLocalStorage('currentView', destination);
    navigate(destination);
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
          <Route path="/" element={
            currentPortal === 'admin'
              ? (isAuthenticated ? <Navigate to="/admin" replace /> : <AuthPage mode="login" portal="admin" onBack={() => navigate('/')} onSuccess={handleAuthSuccess} onSwitchMode={handleNavigateToAuth} logoUrl="/logo.jpg" siteTitle="EvexTicket" />)
              : currentPortal === 'company'
                ? (isAuthenticated ? <Navigate to="/company" replace /> : <AuthPage mode="login" portal="company" onBack={() => navigate('/')} onSuccess={handleAuthSuccess} onSwitchMode={handleNavigateToAuth} logoUrl="/logo.jpg" siteTitle="EvexTicket" />)
                : currentPortal === 'guichet'
                  ? (isAuthenticated ? <Navigate to="/guichet" replace /> : <AuthPage mode="login" portal="guichet" onBack={() => navigate('/')} onSuccess={handleAuthSuccess} onSwitchMode={handleNavigateToAuth} logoUrl="/logo.jpg" siteTitle="EvexTicket" />)
                  : (isAuthenticated ? <Navigate to={getAuthenticatedHomePath(authenticatedUser)} replace /> : <LandingPage onNavigateToAuth={handleNavigateToAuth} onNavigateToHome={() => navigate('/')} logoUrl="/logo.jpg" siteTitle="EvexTicket" />)
          } />
          <Route path="/guichet" element={<ProtectedRoute allowed="guichet"><GuichetLayout /></ProtectedRoute>}>
            <Route index element={<Navigate replace to="tableau-de-bord" />} />
            <Route path="tableau-de-bord" element={<GuichetHomePage />} />
            <Route path="vente" element={<GuichetSalePage />} />
            <Route path="voyages" element={<GuichetTripsPage />} />
            <Route path="scanner" element={<GuichetScannerPage />} />
            <Route path="historique" element={<GuichetHistoryPage />} />
          </Route>
          <Route path="/login" element={<AuthPage mode={authMode} portal={currentPortal} onBack={() => navigate('/')} onSuccess={handleAuthSuccess} onSwitchMode={handleNavigateToAuth} logoUrl="/logo.jpg" siteTitle="EvexTicket" />} />
          <Route path="/register" element={<AuthPage mode={'register'} portal="client" onBack={() => navigate('/')} onSuccess={handleAuthSuccess} onSwitchMode={handleNavigateToAuth} logoUrl="/logo.jpg" siteTitle="EvexTicket" />} />
          <Route path="/company/login" element={<AuthPage mode="login" portal="company" onBack={() => navigate('/')} onSuccess={handleAuthSuccess} onSwitchMode={handleNavigateToAuth} logoUrl="/logo.jpg" siteTitle="EvexTicket" />} />
          <Route path="/guichet/login" element={<AuthPage mode="login" portal="guichet" onBack={() => navigate('/')} onSuccess={handleAuthSuccess} onSwitchMode={handleNavigateToAuth} logoUrl="/logo.jpg" siteTitle="EvexTicket" />} />
          <Route path="/admin/login" element={<AuthPage mode="login" portal="admin" onBack={() => navigate('/')} onSuccess={handleAuthSuccess} onSwitchMode={handleNavigateToAuth} logoUrl="/logo.jpg" siteTitle="EvexTicket" />} />
          <Route path="/home" element={
            <ProtectedRoute allowed={['user', 'company', 'admin']}>
              <HomePage onSearch={handleSearch} isAuthenticated={isAuthenticated} onNavigateToAuth={handleNavigateToAuth} onLogout={handleLogout} onListAllTrips={handleListAllTrips} />
            </ProtectedRoute>
          } />
              <Route path="/results" element={
            <ProtectedRoute allowed={['user', 'company', 'admin']}>
              <ResultsPage
                searchData={searchData}
                searchResults={searchResults as any}
                allTripsDate={allTripsDate}
                onBack={() => navigate('/home')}
                onSelectTrip={handleTripSelect}
              />
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
              <CompanyLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate replace to="tableau-de-bord" />} />
            <Route path="tableau-de-bord" element={<CompanyDashboard />} />
            <Route path="ma-compagnie" element={<CompanyProfilePage />} />
            <Route path="agences" element={<CompanyAgenciesPage />} />
            <Route path="agences/:id" element={<CompanyAgencyDetailPage />} />
            <Route path="utilisateurs" element={<CompanyPersonnelPage />} />
            <Route path="bus" element={<CompanyBusesPage />} />
            <Route path="trajets" element={<CompanyRoutesPage />} />
            <Route path="voyages" element={<CompanyVoyagesPage />} />
            <Route path="voyages/:id" element={<CompanyVoyageDetailPage />} />
            <Route path="billets" element={<CompanyTicketsPage />} />
            <Route path="revenus" element={<CompanyRevenuePage />} />
            <Route path="parametres" element={<CompanySettingsPage />} />
          </Route>

          <Route path="/admin" element={
            <ProtectedRoute allowed={['admin']}>
              <AdminLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate replace to="tableau-de-bord" />} />
            <Route path="tableau-de-bord" element={<AdminDashboardPage />} />
            <Route path="compagnies" element={<AdminCompaniesPage />} />
            <Route path="compagnies/:id" element={<AdminCompanyDetailPage />} />
            <Route path="utilisateurs" element={<AdminUsersPage />} />
            <Route path="voyages" element={<AdminVoyagesPage />} />
            <Route path="billets" element={<AdminTicketsPage />} />
            <Route path="finances" element={<AdminFinancePage />} />
            <Route path="statistiques" element={<AdminAnalyticsPage />} />
            <Route path="audit" element={<AdminAuditPage />} />
            <Route path="parametres" element={<AdminSettingsPage />} />
            <Route path="ma-compagnie" element={<Navigate replace to="/admin/compagnies" />} />
            <Route path="agences/*" element={<Navigate replace to="/admin/compagnies" />} />
            <Route path="bus" element={<Navigate replace to="/admin/voyages" />} />
            <Route path="trajets" element={<Navigate replace to="/admin/voyages" />} />
            <Route path="revenus" element={<Navigate replace to="/admin/finances" />} />
          </Route>

        </Routes>

      </div>
  );
}

export default App;
