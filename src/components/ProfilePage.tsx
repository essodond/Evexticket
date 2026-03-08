import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Phone, Calendar, Shield, LogOut, ChevronRight, Settings, HelpCircle } from 'lucide-react';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    if (window.confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
      logout();
      localStorage.removeItem('searchData');
      localStorage.removeItem('searchResults');
      localStorage.removeItem('selectedTrip');
      localStorage.removeItem('bookingData');
      localStorage.removeItem('paymentData');
      navigate('/');
    }
  };

  const memberSince = user?.date_joined
    ? new Date(user.date_joined).getFullYear()
    : '...';

  const menuItems = [
    { icon: User, label: 'Informations personnelles', desc: 'Modifier vos informations' },
    { icon: Settings, label: 'Paramètres', desc: 'Préférences de l\'application' },
    { icon: HelpCircle, label: 'Aide & Support', desc: 'Centre d\'aide et FAQ' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      {/* Header avec avatar */}
      <div className="bg-blue-600 rounded-b-3xl px-4 pt-8 pb-12">
        <div className="max-w-2xl mx-auto flex items-center gap-5">
          <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
            <User size={40} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">
              {user?.first_name || ''} {user?.last_name || ''}
            </h1>
            <p className="text-blue-200 text-sm mt-1">Membre depuis {memberSince}</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-6">
        {/* Contact info card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
            Informations de contact
          </h2>

          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
              <Mail size={18} className="text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Email</p>
              <p className="text-sm text-gray-900 font-medium">{user?.email || '—'}</p>
            </div>
          </div>

          <div className="border-t border-gray-100 my-3"></div>

          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
              <Phone size={18} className="text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Téléphone</p>
              <p className="text-sm text-gray-900 font-medium">{user?.phone_number || 'Non renseigné'}</p>
            </div>
          </div>

          <div className="border-t border-gray-100 my-3"></div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
              <Calendar size={18} className="text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Date d'inscription</p>
              <p className="text-sm text-gray-900 font-medium">
                {user?.date_joined
                  ? new Date(user.date_joined).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
                  : '—'}
              </p>
            </div>
          </div>
        </div>

        {/* Menu */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 pt-5 pb-2">
            Paramètres
          </h2>
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <div key={item.label}>
                <button
                  onClick={() => alert(`${item.label} — Fonctionnalité à venir`)}
                  className="w-full flex items-center gap-3 px-6 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center">
                    <Icon size={18} className="text-gray-600" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-gray-900">{item.label}</p>
                    <p className="text-xs text-gray-400">{item.desc}</p>
                  </div>
                  <ChevronRight size={18} className="text-gray-300" />
                </button>
                {index < menuItems.length - 1 && <div className="border-t border-gray-100 mx-6"></div>}
              </div>
            );
          })}
        </div>

        {/* Déconnexion */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-3.5 border-2 border-red-200 text-red-500 rounded-2xl font-medium hover:bg-red-50 transition-colors mb-8"
        >
          <LogOut size={18} />
          Déconnexion
        </button>
      </div>
    </div>
  );
}

