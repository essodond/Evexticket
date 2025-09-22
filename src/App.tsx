import { useEffect, useState } from 'react';
import apiService from './services/api';
import LandingPage from './components/LandingPage';
import AuthPage from './components/AuthPage';
import HomePage from './components/HomePage';
import ResultsPage from './components/ResultsPage';
import BookingPage from './components/BookingPage';
import PaymentPage from './components/PaymentPage';
import ConfirmationPage from './components/ConfirmationPage';
import CompanyDashboard from './components/CompanyDashboard';
import AdminDashboard from './components/AdminDashboard';

type ViewType = 'landing' | 'auth' | 'home' | 'results' | 'booking' | 'payment' | 'confirmation' | 'company-dashboard' | 'admin-dashboard';
type AuthMode = 'login' | 'register';

function App() {
  const [currentView, setCurrentView] = useState<ViewType>('landing');
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [searchData, setSearchData] = useState<any>(null);
  const [selectedTrip, setSelectedTrip] = useState<any>(null);
  const [bookingData, setBookingData] = useState<any>(null);
  const [paymentData, setPaymentData] = useState<any>(null);

  const handleSearch = (data: any) => {
    setSearchData(data);
    setCurrentView('results');
    localStorage.setItem('currentView', 'results');
  };

  const handleTripSelect = (trip: any) => {
    setSelectedTrip(trip);
    setCurrentView('booking');
    localStorage.setItem('currentView', 'booking');
  };

  const handleProceedToPayment = (data: any) => {
    setBookingData(data);
    setCurrentView('payment');
    localStorage.setItem('currentView', 'payment');
  };

  const handlePaymentSuccess = (data: any) => {
    setPaymentData(data);
    setCurrentView('confirmation');
    localStorage.setItem('currentView', 'confirmation');
  };

  const handleNewBooking = () => {
    setCurrentView('home');
    localStorage.setItem('currentView', 'home');
    setSearchData(null);
    setSelectedTrip(null);
    setBookingData(null);
    setPaymentData(null);
  };

  const handleNavigateToAuth = (mode: AuthMode) => {
    setAuthMode(mode);
    setCurrentView('auth');
    localStorage.setItem('currentView', 'auth');
  };

  const handleAuthSuccess = () => {
    setIsAuthenticated(true);
    setCurrentView('home');
    localStorage.setItem('currentView', 'home');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    // Clear stored token so user stays logged out after refresh
    apiService.setAuthToken(null);
    setCurrentView('landing');
    localStorage.setItem('currentView', 'landing');
    setSearchData(null);
    setSelectedTrip(null);
    setBookingData(null);
    setPaymentData(null);
  };

  // On app mount, restore auth token from localStorage if present
  useEffect(() => {
    try {
      const token = typeof localStorage !== 'undefined' ? localStorage.getItem('authToken') : null;
      if (token) {
        apiService.setAuthToken(token);
        setIsAuthenticated(true);
        // Restore previous view if available, otherwise go to home
        const savedView = localStorage.getItem('currentView') as ViewType | null;
        if (savedView) {
          setCurrentView(savedView);
        } else {
          setCurrentView('home');
        }
      }
    } catch (e) {
      console.warn('Could not restore auth token:', e);
    }
  }, []);

  // Quick navigation for demonstration
  const showDashboardControls = () => (
    <div className="fixed bottom-4 right-4 flex flex-col space-y-2 z-50">
      <button
        onClick={() => setCurrentView('home')}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow-lg hover:bg-blue-700 transition-colors text-sm"
      >
        Accueil Voyageur
      </button>
      <button
        onClick={() => setCurrentView('company-dashboard')}
        className="px-4 py-2 bg-green-600 text-white rounded-lg shadow-lg hover:bg-green-700 transition-colors text-sm"
      >
        Dashboard Compagnie
      </button>
      <button
        onClick={() => setCurrentView('admin-dashboard')}
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
      {currentView === 'landing' && (
        <LandingPage 
          onNavigateToAuth={handleNavigateToAuth}
          onNavigateToHome={() => setCurrentView('home')}
        />
      )}
      
      {currentView === 'auth' && (
        <AuthPage 
          mode={authMode}
          onBack={() => setCurrentView('landing')}
          onSuccess={handleAuthSuccess}
          onSwitchMode={handleNavigateToAuth}
        />
      )}
      
      {currentView === 'home' && (
        <HomePage onSearch={handleSearch} />
      )}
      
      {currentView === 'results' && (
        <ResultsPage 
          searchData={searchData}
          onBack={() => setCurrentView('home')}
          onSelectTrip={handleTripSelect}
        />
      )}
      
      {currentView === 'booking' && (
        <BookingPage 
          trip={selectedTrip}
          searchData={searchData}
          onBack={() => setCurrentView('results')}
          onProceedToPayment={handleProceedToPayment}
        />
      )}
      
      {currentView === 'payment' && (
        <PaymentPage 
          bookingData={bookingData}
          onBack={() => setCurrentView('booking')}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}
      
      {currentView === 'confirmation' && (
        <ConfirmationPage 
          paymentData={paymentData}
          onNewBooking={handleNewBooking}
        />
      )}
      
      {currentView === 'company-dashboard' && <CompanyDashboard />}
      
      {currentView === 'admin-dashboard' && <AdminDashboard />}

      {showDashboardControls()}
    </div>
  );
}

export default App;