import React, { useState } from 'react';
import { Bus, MapPin, Clock, Shield, Users, Star, ArrowRight, CheckCircle } from 'lucide-react';

interface LandingPageProps {
  onNavigateToAuth: (mode: 'login' | 'register') => void;
  onNavigateToHome: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onNavigateToAuth, onNavigateToHome }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleReserveTicket = () => {
    if (isLoggedIn) {
      onNavigateToHome();
    } else {
      // Pour la démo, on va directement à l'inscription
      onNavigateToAuth('register');
    }
  };

  const features = [
    {
      icon: <Bus className="w-8 h-8 text-blue-600" />,
      title: "Transport Sécurisé",
      description: "Voyagez en toute sécurité avec nos bus modernes et nos chauffeurs expérimentés"
    },
    {
      icon: <MapPin className="w-8 h-8 text-green-600" />,
      title: "Couverture Nationale",
      description: "Découvrez tout le Togo : de Lomé à Kara, en passant par Kpalimé et Sokodé"
    },
    {
      icon: <Clock className="w-8 h-8 text-orange-600" />,
      title: "Horaires Flexibles",
      description: "Départs fréquents toute la journée pour s'adapter à votre emploi du temps"
    },
    {
      icon: <Shield className="w-8 h-8 text-purple-600" />,
      title: "Paiement Sécurisé",
      description: "Payez en toute sécurité par mobile money, carte bancaire ou espèces"
    },
    {
      icon: <Users className="w-8 h-8 text-red-600" />,
      title: "Service Client",
      description: "Notre équipe est disponible 24h/24 pour vous accompagner"
    },
    {
      icon: <Star className="w-8 h-8 text-yellow-600" />,
      title: "Confort Garanti",
      description: "Sièges confortables, climatisation et WiFi gratuit à bord"
    }
  ];

  const destinations = [
    { name: "Lomé", image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=300&h=200&fit=crop" },
    { name: "Kara", image: "https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=300&h=200&fit=crop" },
    { name: "Kpalimé", image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=300&h=200&fit=crop" },
    { name: "Sokodé", image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=300&h=200&fit=crop" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      {/* Header */}
      <header className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Bus className="w-10 h-10 text-blue-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">TogoTrans</h1>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => onNavigateToAuth('login')}
                className="px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
              >
                Se connecter
              </button>
              <button
                onClick={() => onNavigateToAuth('register')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                S'inscrire
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-5xl font-bold text-gray-900 mb-6">
                Voyagez à travers le{' '}
                <span className="text-blue-600">Togo</span> en toute{' '}
                <span className="text-green-600">sécurité</span>
              </h2>
              <p className="text-xl text-gray-600 mb-8">
                Réservez vos billets de bus en ligne, découvrez les plus belles destinations du Togo 
                et voyagez confortablement avec TogoTrans, votre partenaire de transport de confiance.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={handleReserveTicket}
                  className="px-8 py-4 bg-blue-600 text-white text-lg font-semibold rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
                >
                  Réserver mon ticket
                  <ArrowRight className="ml-2 w-5 h-5" />
                </button>
                <button
                  onClick={() => onNavigateToAuth('login')}
                  className="px-8 py-4 border border-gray-300 text-gray-700 text-lg font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Se connecter
                </button>
              </div>
            </div>
            <div className="relative">
              <div className="bg-gradient-to-r from-blue-500 to-green-500 rounded-2xl p-8 text-white">
                <div className="text-center">
                  <Bus className="w-24 h-24 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold mb-2">TogoTrans</h3>
                  <p className="text-blue-100">Votre transport, notre passion</p>
                </div>
              </div>
              {/* Images décoratives */}
              <div className="absolute -top-4 -right-4 w-20 h-20 bg-yellow-400 rounded-full opacity-80"></div>
              <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-red-400 rounded-full opacity-80"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h3 className="text-4xl font-bold text-gray-900 mb-4">
              Pourquoi choisir TogoTrans ?
            </h3>
            <p className="text-xl text-gray-600">
              Nous nous engageons à vous offrir la meilleure expérience de voyage
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-gray-50 p-6 rounded-xl hover:shadow-lg transition-shadow">
                <div className="mb-4">{feature.icon}</div>
                <h4 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h4>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Destinations Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h3 className="text-4xl font-bold text-gray-900 mb-4">
              Découvrez le Togo
            </h3>
            <p className="text-xl text-gray-600">
              Des destinations magnifiques vous attendent
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {destinations.map((destination, index) => (
              <div key={index} className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
                <div className="h-48 bg-gradient-to-r from-blue-400 to-green-400 flex items-center justify-center">
                  <MapPin className="w-12 h-12 text-white" />
                </div>
                <div className="p-4">
                  <h4 className="text-xl font-semibold text-gray-900">{destination.name}</h4>
                  <p className="text-gray-600">Découvrez cette magnifique ville</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-blue-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h3 className="text-4xl font-bold text-white mb-6">
            Prêt à commencer votre voyage ?
          </h3>
          <p className="text-xl text-blue-100 mb-8">
            Rejoignez des milliers de voyageurs qui nous font confiance
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleReserveTicket}
              className="px-8 py-4 bg-white text-blue-600 text-lg font-semibold rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center"
            >
              Réserver maintenant
              <ArrowRight className="ml-2 w-5 h-5" />
            </button>
            <button
              onClick={() => onNavigateToAuth('register')}
              className="px-8 py-4 border-2 border-white text-white text-lg font-semibold rounded-lg hover:bg-white hover:text-blue-600 transition-colors"
            >
              Créer un compte
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <Bus className="w-8 h-8 text-blue-400 mr-2" />
                <span className="text-xl font-bold">TogoTrans</span>
              </div>
              <p className="text-gray-400">
                Votre partenaire de transport de confiance au Togo
              </p>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Destinations</h4>
              <ul className="space-y-2 text-gray-400">
                <li>Lomé</li>
                <li>Kara</li>
                <li>Kpalimé</li>
                <li>Sokodé</li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Services</h4>
              <ul className="space-y-2 text-gray-400">
                <li>Réservation en ligne</li>
                <li>Paiement sécurisé</li>
                <li>Service client 24/7</li>
                <li>WiFi gratuit</li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Contact</h4>
              <ul className="space-y-2 text-gray-400">
                <li>+228 XX XX XX XX</li>
                <li>contact@togotrans.tg</li>
                <li>Lomé, Togo</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 TogoTrans. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
