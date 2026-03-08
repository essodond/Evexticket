import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Ticket, User, LogOut } from 'lucide-react';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (!isAuthenticated) return null;

  // Ne pas afficher la navbar sur les dashboards admin/company, la landing page, et les pages d'auth
  if (location.pathname === '/' || location.pathname === '/login' || location.pathname === '/register') return null;
  if (location.pathname.startsWith('/admin') || location.pathname.startsWith('/company')) return null;

  const navItems = [
    { path: '/home', label: 'Accueil', icon: Home },
    { path: '/my-tickets', label: 'Mes Tickets', icon: Ticket },
    { path: '/profile', label: 'Profil', icon: User },
  ];

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = () => {
    logout();
    localStorage.removeItem('searchData');
    localStorage.removeItem('searchResults');
    localStorage.removeItem('selectedTrip');
    localStorage.removeItem('bookingData');
    localStorage.removeItem('paymentData');
    navigate('/');
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => navigate('/home')}
          >
            <img src="/logo.jpg" alt="EVEX" className="h-9 w-9 rounded-lg object-cover" />
            <span className="text-lg font-bold text-blue-600 hidden sm:block">EVEX Ticket</span>
          </div>

          {/* Navigation links */}
          <div className="flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive(item.path)
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon size={18} />
                  <span className="hidden sm:inline">{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* User info + logout */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600 hidden md:block">
              {user?.first_name} {user?.last_name}
            </span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 px-3 py-2 text-sm text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Déconnexion</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}


