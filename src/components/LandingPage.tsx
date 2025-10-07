import React, { useState } from 'react';
// LANDING PAGE
// Page d'accueil marketing. Elle propose des actions rapides pour aller vers
// l'inscription/connexion ou la recherche de trajets pour les voyageurs.
import { Bus, MapPin, Clock, Shield, Users, Star, ArrowRight, Lock } from 'lucide-react';

interface LandingPageProps {
  onNavigateToAuth: (mode: 'login' |'register') => void;
  onNavigateToHome: () => void;
  /** URL public du logo à afficher dans l'en-tête (optionnel). Ex: '/logo.png' */
  logoUrl?: string;
  /** Texte alternatif pour le logo */
  logoAlt?: string;
}

const LandingPage: React.FC<LandingPageProps> = ({ onNavigateToAuth, onNavigateToHome, logoUrl = undefined, logoAlt = undefined }) => {
  const [isLoggedIn] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

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
    { name: 'Lomé', image: 'https://i.pinimg.com/736x/9c/cd/6e/9ccd6e29dc537fc53e9a08ee54e9b3a3.jpg' },
    { name: 'Kara', image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTFnHDfOQwYE9pg0Xj3xoJdai_oD_sMfZnPLQ&s' },
    { name: 'Kpalimé', image: 'https://via.placeholder.com/800x600?text=Kpalime' },
    { name: 'Sokodé', image: 'https://via.placeholder.com/800x600?text=Sokode' }
  ];

  return (
    <div>
      {/* Hero Section */}
      <section className="relative bg-blue-600">
        <div className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-5xl font-extrabold text-white mb-4">
              Bienvenue sur EvexTicket
            </h1>
            <p className="text-xl text-blue-200 mb-8">
              Votre plateforme de réservation de trajets au Togo
            </p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => onNavigateToAuth('login')}
                className="px-8 py-4 bg-white text-blue-600 text-lg font-semibold rounded-lg hover:bg-gray-100 transition-colors"
              >
                Connexion
                <Lock className="ml-2 w-5 h-5" />
              </button>
              <button
                onClick={() => onNavigateToAuth('register')}
                className="px-8 py-4 border-2 border-white text-white text-lg font-semibold rounded-lg hover:bg-white hover:text-blue-600 transition-colors"
              >
                S'inscrire
              </button>
            </div>
          </div>

          <div className="mt-16">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {destinations.map((destination) => (
                <div key={destination.name} className="rounded-lg overflow-hidden shadow-lg">
                  <img src={destination.image} alt={destination.name} className="w-full h-48 object-cover" />
                  <div className="p-4 bg-white">
                    <h3 className="text-xl font-semibold mb-2">{destination.name}</h3>
                    <p className="text-gray-600">
                      Découvrez les merveilles de {destination.name} avec nos trajets confortables.
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">
            Pourquoi choisir EvexTicket ?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {features.map((feature) => (
              <div key={feature.title} className="flex items-start">
                <div className="mr-4">{feature.icon}</div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 bg-gradient-to-r from-blue-50 to-green-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-3xl font-bold mb-6">Ils nous font confiance</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <blockquote className="bg-white p-6 rounded-xl shadow">
              <p className="text-gray-700">« Réservation simple et service impeccable. Mes trajets vers Kara sont toujours confortables. »</p>
              <footer className="mt-4 text-sm text-gray-500">— A. Koffi</footer>
            </blockquote>
            <blockquote className="bg-white p-6 rounded-xl shadow">
              <p className="text-gray-700">« Chauffeurs professionnels et bus propres. Je recommande EvexTicket. »</p>
              <footer className="mt-4 text-sm text-gray-500">— M. Ahoueke</footer>
            </blockquote>
            <blockquote className="bg-white p-6 rounded-xl shadow">
              <p className="text-gray-700">« Paiement mobile rapide et support réactif. Très pratique. »</p>
              <footer className="mt-4 text-sm text-gray-500">— S. Agbo</footer>
            </blockquote>
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
                <span className="text-xl font-bold"> EvexTicket</span>
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
                <li>+228 71 60 80 97</li>
                <li>contact@evexTicket.tg</li>
                <li>Lomé, Togo</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024  EvexTicket. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
