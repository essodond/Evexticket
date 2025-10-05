import React, { useState } from 'react';
// LANDING PAGE
// Page d'accueil marketing. Elle propose des actions rapides pour aller vers
// l'inscription/connexion ou la recherche de trajets pour les voyageurs.
import { Bus, MapPin, Clock, Shield, Users, Star, ArrowRight } from 'lucide-react';

interface LandingPageProps {
  onNavigateToAuth: (mode: 'login' | 'register') => void;
  onNavigateToHome: () => void;
  /** URL public du logo à afficher dans l'en-tête (optionnel). Ex: '/logo.png' */
  logoUrl?: string;
  /** Texte alternatif pour le logo */
  logoAlt?: string;
}

const LandingPage: React.FC<LandingPageProps> = ({ onNavigateToAuth, onNavigateToHome }) => {
  const [isLoggedIn] = useState(false);

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
    { name: 'Lomé', image: 'https://images.unsplash.com/photo-1601758123927-4b6f0a0d3f5b?q=80&w=1200&auto=format&fit=crop&ixlib=rb-4.0.3&s=8d0fc1c1d9f0c3ad1f3f9d8c6f0d3a7a' },
    { name: 'Kara', image: 'https://images.unsplash.com/photo-1587502537745-1c89b6a0c3ad?q=80&w=1200&auto=format&fit=crop&ixlib=rb-4.0.3&s=5a2b6a1ac0f3b7e2a7a6c9d4a1b0f9d8' },
    { name: "Kpalimé", image: 'https://images.unsplash.com/photo-1506801310323-534be5e7bb65?q=80&w=1200&auto=format&fit=crop&ixlib=rb-4.0.3&s=3f2a1b2c4d5e6f7a8b9c0d1e2f3a4b5c' },
    { name: 'Sokodé', image: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=1200&auto=format&fit=crop&ixlib=rb-4.0.3&s=7b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      {/* Header */}
      <header className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              {/* Logo: preferer `logoUrl` si fourni */}
              {/** @note: fournissez votre logo en plaçant le fichier dans /public et en passant '/logo.png' à la prop logoUrl */}
              {/** eslint-disable-next-line @next/next/no-img-element */}
              {props.logoUrl ? (
                <img src={props.logoUrl} alt={props.logoAlt || 'Logo'} className="w-10 h-10 object-contain mr-3" />
              ) : (
                <Bus className="w-10 h-10 text-blue-600 mr-3" />
              )}
              <h1 className="text-2xl font-bold text-gray-900">EvexTicket</h1>
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
                et voyagez confortablement avec Evexticket, votre partenaire de transport de confiance.
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
              <div className="rounded-2xl overflow-hidden shadow-xl">
                <div className="relative h-80 bg-gray-200">
                  <img src={destinations[0].image} alt="Togo paysage" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent flex items-end">
                    <div className="p-6 text-white">
                      <h3 className="text-2xl font-bold">Explorez Lomé et ses alentours</h3>
                      <p className="text-sm">Trajets fréquents, confort et sécurité.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h3 className="text-4xl font-bold text-gray-900 mb-4">
              Pourquoi choisir EvexTicket ?
            </h3>
            <p className="text-xl text-gray-600">
              Nous nous engageons à vous offrir la meilleure expérience de voyage
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-gradient-to-tr from-white to-gray-50 p-6 rounded-2xl hover:shadow-2xl transition-shadow border">
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
                <div className="h-48 relative">
                  <img src={destination.image} alt={destination.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/20 flex items-end">
                    <div className="p-4 text-white">
                      <h4 className="text-lg font-semibold">{destination.name}</h4>
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <p className="text-gray-600">Découvrez cette magnifique ville</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security / Reliability Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div>
              <h3 className="text-3xl font-bold text-gray-900 mb-4">Sécurité & Fiabilité</h3>
              <p className="text-gray-600 mb-6">Nous mettons la sécurité au cœur de nos opérations : inspections régulières des véhicules, formation continue des conducteurs et support client disponible 24/7. Vos données et paiements sont chiffrés et traités par des prestataires de confiance.</p>
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-start"><Shield className="w-5 h-5 text-purple-600 mr-3"/> Véhicules entretenus et contrôles réguliers</li>
                <li className="flex items-start"><Users className="w-5 h-5 text-red-600 mr-3"/> Chauffeurs formés et évalués</li>
                <li className="flex items-start"><Lock className="w-5 h-5 text-yellow-600 mr-3"/> Paiement et données sécurisées</li>
              </ul>
            </div>
            <div className="rounded-xl overflow-hidden shadow-lg">
              <img src="https://images.unsplash.com/photo-1549576490-b0b4831ef60a?q=80&w=1400&auto=format&fit=crop&ixlib=rb-4.0.3&s=abcd1234" alt="Contrôle bus" className="w-full h-80 object-cover" />
            </div>
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
