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
  /** Titre du site à afficher dans l'en-tête */
  siteTitle?: string;
}

const LandingPage: React.FC<LandingPageProps> = ({ onNavigateToAuth, onNavigateToHome, logoUrl = undefined, logoAlt = undefined, siteTitle = "EvexTicket" }) => {
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
      icon: <Bus className="w-8 h-8 text-teal-300" />,
      title: "Transport Sécurisé",
      description: "Voyagez en toute sécurité avec nos bus modernes et nos chauffeurs expérimentés"
    },
    {
      icon: <MapPin className="w-8 h-8 text-indigo-300" />,
      title: "Couverture Nationale",
      description: "Découvrez tout le Togo : de Lomé à Kara, en passant par Kpalimé et Sokodé"
    },
    {
      icon: <Clock className="w-8 h-8 text-orange-300" />,
      title: "Horaires Flexibles",
      description: "Départs fréquents toute la journée pour s'adapter à votre emploi du temps"
    },
    {
      icon: <Shield className="w-8 h-8 text-purple-300" />,
      title: "Paiement Sécurisé",
      description: "Payez en toute sécurité par mobile money, carte bancaire ou espèces"
    },
    {
      icon: <Users className="w-8 h-8 text-rose-300" />,
      title: "Service Client",
      description: "Notre équipe est disponible 24h/24 pour vous accompagner"
    },
    {
      icon: <Star className="w-8 h-8 text-yellow-300" />,
      title: "Confort Garanti",
      description: "Sièges confortables, climatisation et WiFi gratuit à bord"
    }
  ];

  const destinations = [
    { name: 'Lomé', image: 'https://i.pinimg.com/736x/9c/cd/6e/9ccd6e29dc537fc53e9a08ee54e9b3a3.jpg' },
    { name: 'Kara', image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTFnHDfOQwYE9pg0Xj3xoJdai_oD_sMfZnPLQ&s' },
    { name: "Kpalimé", image: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=60' },
    { name: 'Sokodé', image: 'https://images.unsplash.com/photo-1505739774209-0a0b2f6a9c8d?auto=format&fit=crop&w=1200&q=60' }
  ];

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-900 to-sky-800 text-slate-100">

      {/* Animated radial highlights for a futuristic vibe */}
      <div className="pointer-events-none absolute -z-10 inset-0">
        <div className="absolute -left-20 -top-40 w-96 h-96 bg-gradient-to-tr from-indigo-500/30 to-transparent rounded-full blur-3xl animate-blob" />
        <div className="absolute -right-10 bottom-10 w-80 h-80 bg-gradient-to-tr from-teal-400/20 to-transparent rounded-full blur-2xl animate-blob animation-delay-2000" />
      </div>

      {/* Header (translucent, centered) */}
      <header className="backdrop-blur-md bg-white/5 border-b border-white/10 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-3">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt={logoAlt || 'Logo'} className="w-10 h-10 object-contain rounded-md" />
              ) : (
                <div className="p-2 bg-gradient-to-br from-indigo-600 to-teal-400 rounded-md">
                  <Bus className="w-6 h-6 text-slate-900" />
                </div>
              )}
              <h1 className="text-xl font-extrabold tracking-tight">{siteTitle}</h1>
            </div>

            <div className="hidden sm:flex items-center space-x-4">
              <button
                onClick={() => onNavigateToAuth('login')}
                className="px-4 py-2 border border-white/10 text-slate-100 rounded-lg hover:bg-white/5 transition"
              >
                Se connecter
              </button>
              <button
                onClick={() => onNavigateToAuth('register')}
                className="px-4 py-2 bg-gradient-to-r from-teal-400 to-indigo-500 text-slate-900 rounded-lg font-semibold shadow-lg hover:scale-[1.02] transform transition"
              >
                S'inscrire
              </button>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMenuOpen(open => !open)}
              className="sm:hidden inline-flex items-center justify-center p-2 rounded-md text-slate-100 hover:bg-white/5"
              aria-label="Ouvrir le menu"
              aria-expanded={menuOpen}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={menuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu panel */}
      {menuOpen && (
        <div className="sm:hidden bg-white/3 backdrop-blur-md border-t border-white/5">
          <div className="px-4 pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoUrl} alt={logoAlt || 'Logo'} className="w-8 h-8 object-contain mr-3" />
                ) : (
                  <Bus className="w-8 h-8 text-teal-300 mr-3" />
                )}
                <span className="font-bold text-lg">{siteTitle}</span>
              </div>
              <button onClick={() => setMenuOpen(false)} className="p-2 rounded-md text-slate-100">
                <span className="sr-only">Fermer</span>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <button onClick={() => { setMenuOpen(false); onNavigateToAuth('login'); }} className="w-full text-left px-4 py-2 rounded-md border border-white/10">Se connecter</button>
              <button onClick={() => { setMenuOpen(false); onNavigateToAuth('register'); }} className="w-full text-left px-4 py-2 rounded-md bg-gradient-to-r from-teal-400 to-indigo-500 text-slate-900">S'inscrire</button>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="relative py-24 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-5xl sm:text-6xl font-extrabold leading-tight text-white mb-6">
              Voyagez à travers le <span className="text-teal-300">Togo</span> avec une expérience <span className="text-indigo-300">futuriste</span>
            </h2>
            <p className="text-lg text-slate-200 mb-8 max-w-xl">Réservez vos billets en quelques secondes, suivez votre trajet en temps réel et profitez d'un confort modernisé. Simple, rapide et sûr.</p>

            <div className="flex gap-4 flex-col sm:flex-row">
              <button
                onClick={handleReserveTicket}
                className="inline-flex items-center gap-3 px-6 py-4 rounded-xl bg-gradient-to-r from-teal-400 to-indigo-600 text-slate-900 font-bold shadow-2xl hover:scale-[1.02] transform transition"
              >
                Réserver mon ticket
                <ArrowRight className="w-5 h-5" />
              </button>
              <button
                onClick={() => onNavigateToAuth('login')}
                className="px-6 py-4 rounded-xl border border-white/10 text-slate-100 hover:bg-white/5 transition"
              >
                Se connecter
              </button>
            </div>
          </div>

          <div className="relative">
            <div className="rounded-3xl overflow-hidden shadow-2xl border border-white/5 bg-gradient-to-tr from-white/5 to-white/2">
              <div className="relative h-96">
                <img loading="lazy" src={destinations[0].image} alt="Togo paysage" className="w-full h-full object-cover mix-blend-overlay opacity-95" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent flex items-end">
                  <div className="p-6 text-white">
                    <h3 className="text-2xl font-bold">Explorez Lomé et ses alentours</h3>
                    <p className="text-sm">Trajets fréquents, confort et sécurité.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              {destinations.slice(1).map((d, i) => (
                <div key={i} className="rounded-xl overflow-hidden shadow-lg border border-white/5 bg-white/3 backdrop-blur-md">
                  <img loading="lazy" src={d.image} alt={d.name} className="w-full h-32 object-cover" />
                  <div className="p-3 text-sm text-slate-200">{d.name}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section (glass cards) */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-white mb-2">Pourquoi choisir EvexTicket ?</h3>
            <p className="text-slate-300 max-w-2xl mx-auto">Une plate-forme pensée pour les voyageurs modernes — réactive, sécurisée et conçue pour simplifier vos déplacements.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="p-6 rounded-2xl border border-white/6 bg-white/3 backdrop-blur-md hover:scale-105 transform transition-shadow shadow-xl">
                <div className="mb-4">{feature.icon}</div>
                <h4 className="text-xl font-semibold text-white mb-2">{feature.title}</h4>
                <p className="text-slate-200">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Destinations Section (compact) */}
      <section className="py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10">
            <h3 className="text-3xl font-bold text-white">Découvrez le Togo</h3>
            <p className="text-slate-300">Des destinations magnifiques, prêtes à être explorées.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {destinations.map((destination, index) => (
              <div key={index} className="rounded-xl overflow-hidden shadow-lg border border-white/6 bg-white/3 backdrop-blur-md">
                <div className="h-40 relative">
                  <img loading="lazy" src={destination.image} alt={destination.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/20 flex items-end">
                    <div className="p-4 text-white">
                      <h4 className="text-lg font-semibold">{destination.name}</h4>
                    </div>
                  </div>
                </div>
                <div className="p-4 text-slate-200">
                  <p>Découvrez cette magnifique ville</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security Section (kept concise) */}
      <section className="py-16 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div>
            <h3 className="text-2xl font-bold text-white mb-4">Sécurité & Fiabilité</h3>
            <p className="text-slate-300 mb-6">Inspections régulières, conducteurs formés et chiffrement des paiements — tout pour garantir votre sérénité.</p>
            <ul className="space-y-3 text-slate-200">
              <li className="flex items-start"><Shield className="w-5 h-5 text-purple-300 mr-3"/> Véhicules entretenus et contrôles réguliers</li>
              <li className="flex items-start"><Users className="w-5 h-5 text-rose-300 mr-3"/> Chauffeurs formés et évalués</li>
              <li className="flex items-start"><Lock className="w-5 h-5 text-yellow-300 mr-3"/> Paiement et données sécurisées</li>
            </ul>
          </div>
          <div className="rounded-xl overflow-hidden shadow-lg border border-white/6 bg-white/3 backdrop-blur-md">
            <img loading="lazy" src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1200&q=60" alt="Sécurité" className="w-full h-64 object-cover" />
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-12 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h3 className="text-2xl font-bold text-white mb-6">Ils nous font confiance</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <blockquote className="bg-white/3 p-6 rounded-xl shadow">
              <p className="text-slate-900">« Réservation simple et service impeccable. Mes trajets vers Kara sont toujours confortables. »</p>
              <footer className="mt-4 text-sm text-slate-700">— A. Koffi</footer>
            </blockquote>
            <blockquote className="bg-white/3 p-6 rounded-xl shadow">
              <p className="text-slate-900">« Chauffeurs professionnels et bus propres. Je recommande EvexTicket. »</p>
              <footer className="mt-4 text-sm text-slate-700">— M. Ahoueke</footer>
            </blockquote>
            <blockquote className="bg-white/3 p-6 rounded-xl shadow">
              <p className="text-slate-900">« Paiement mobile rapide et support réactif. Très pratique. »</p>
              <footer className="mt-4 text-sm text-slate-700">— S. Agbo</footer>
            </blockquote>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h3 className="text-3xl font-bold text-white mb-4">Prêt à commencer ?</h3>
          <p className="text-slate-300 mb-6">Des trajets instantanés et une expérience modernisée vous attendent.</p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={handleReserveTicket}
              className="px-6 py-3 rounded-full bg-gradient-to-r from-teal-400 to-indigo-500 text-slate-900 font-semibold shadow-lg"
            >
              Réserver maintenant
            </button>
            <button onClick={() => onNavigateToAuth('register')} className="px-6 py-3 rounded-full border border-white/10 text-slate-100">Créer un compte</button>
          </div>
        </div>
      </section>

      {/* Minimal Footer (navigation lists removed as requested) */}
      <footer className="py-8">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="p-2 bg-gradient-to-br from-indigo-600 to-teal-400 rounded-md">
              <Bus className="w-6 h-6 text-slate-900" />
            </div>
            <span className="font-semibold">{siteTitle}</span>
          </div>
          <p className="text-sm text-slate-300">© {new Date().getFullYear()} {siteTitle} — Tous droits réservés.</p>
        </div>
      </footer>

    </div>
  );
};

export default LandingPage;
