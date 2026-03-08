import React, { useState, useEffect, useRef } from 'react';
import { Bus, MapPin, Clock, Shield, Users, Star, ArrowRight, Lock, Zap, ChevronRight, Phone, Mail, CheckCircle } from 'lucide-react';

interface LandingPageProps {
  onNavigateToAuth: (mode: 'login' | 'register') => void;
  onNavigateToHome: () => void;
  logoUrl?: string;
  logoAlt?: string;
  siteTitle?: string;
}

/* ====================== SVG COMPONENTS ====================== */

/** Isometric 3D Bus SVG */
const Bus3D: React.FC<{ className?: string; color?: string; animated?: boolean }> = ({ className = '', color = '#3b82f6', animated = false }) => (
  <div className={`relative inline-block ${animated ? 'bus-rolling' : ''} ${className}`}>
    {/* Speed lines (only when animated) */}
    {animated && (
      <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4">
        <div className="speed-lines" style={{ animationDelay: '0s' }}>
          <div className="w-6 h-[2px] bg-blue-300/40 rounded-full mb-2" />
        </div>
        <div className="speed-lines" style={{ animationDelay: '0.3s' }}>
          <div className="w-8 h-[2px] bg-blue-300/30 rounded-full mb-2" />
        </div>
        <div className="speed-lines" style={{ animationDelay: '0.5s' }}>
          <div className="w-5 h-[2px] bg-blue-300/30 rounded-full" />
        </div>
      </div>
    )}
    <svg viewBox="0 0 220 130" className="w-full h-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Exhaust smoke */}
      {animated && (
        <>
          <circle cx="18" cy="78" r="4" fill="#cbd5e1" opacity="0.3" className="exhaust-puff" />
          <circle cx="14" cy="74" r="6" fill="#e2e8f0" opacity="0.2" className="exhaust-puff-delay" />
          <circle cx="10" cy="70" r="5" fill="#e2e8f0" opacity="0.15" className="exhaust-puff-delay-2" />
        </>
      )}
      {/* Bus body */}
      <rect x="30" y="30" width="155" height="60" rx="12" fill={color} />
      <rect x="30" y="30" width="155" height="60" rx="12" fill="url(#busShineAnim)" />
      {/* Windows */}
      <rect x="45" y="40" width="22" height="20" rx="4" fill="#bfdbfe" opacity="0.9" />
      <rect x="73" y="40" width="22" height="20" rx="4" fill="#bfdbfe" opacity="0.9" />
      <rect x="101" y="40" width="22" height="20" rx="4" fill="#bfdbfe" opacity="0.9" />
      <rect x="129" y="40" width="22" height="20" rx="4" fill="#bfdbfe" opacity="0.9" />
      {/* Windshield */}
      <rect x="157" y="38" width="20" height="28" rx="5" fill="#93c5fd" />
      <rect x="159" y="40" width="16" height="24" rx="3" fill="#bfdbfe" opacity="0.3" />
      {/* Headlights with glow */}
      <g className={animated ? 'headlight-glow' : ''}>
        <circle cx="182" cy="75" r="5" fill="#fbbf24" />
        <circle cx="182" cy="75" r="3" fill="#fef3c7" />
      </g>
      {/* Taillights */}
      <rect x="30" y="68" width="6" height="10" rx="2" fill="#ef4444" />
      {/* Stripe */}
      <rect x="30" y="65" width="155" height="4" rx="2" fill="white" opacity="0.3" />
      {/* Logo on bus */}
      <text x="90" y="80" fill="white" fontSize="10" fontWeight="bold" fontFamily="system-ui" opacity="0.7">EVEX</text>

      {/* Front wheel with animated spokes */}
      <g>
        <circle cx="150" cy="93" r="13" fill="#1e293b" />
        <g className={animated ? 'wheel-spin' : ''} style={{ transformOrigin: '150px 93px' }}>
          <circle cx="150" cy="93" r="8" fill="#475569" />
          <circle cx="150" cy="93" r="3" fill="#94a3b8" />
          {/* Spokes */}
          <line x1="150" y1="85" x2="150" y2="101" stroke="#94a3b8" strokeWidth="1" opacity="0.5" />
          <line x1="142" y1="93" x2="158" y2="93" stroke="#94a3b8" strokeWidth="1" opacity="0.5" />
          <line x1="144" y1="87" x2="156" y2="99" stroke="#94a3b8" strokeWidth="1" opacity="0.4" />
          <line x1="156" y1="87" x2="144" y2="99" stroke="#94a3b8" strokeWidth="1" opacity="0.4" />
        </g>
        {/* Tire tread marks */}
        <circle cx="150" cy="93" r="13" fill="none" stroke="#334155" strokeWidth="1" strokeDasharray="3 3" />
      </g>

      {/* Rear wheel with animated spokes */}
      <g>
        <circle cx="65" cy="93" r="13" fill="#1e293b" />
        <g className={animated ? 'wheel-spin' : ''} style={{ transformOrigin: '65px 93px' }}>
          <circle cx="65" cy="93" r="8" fill="#475569" />
          <circle cx="65" cy="93" r="3" fill="#94a3b8" />
          {/* Spokes */}
          <line x1="65" y1="85" x2="65" y2="101" stroke="#94a3b8" strokeWidth="1" opacity="0.5" />
          <line x1="57" y1="93" x2="73" y2="93" stroke="#94a3b8" strokeWidth="1" opacity="0.5" />
          <line x1="59" y1="87" x2="71" y2="99" stroke="#94a3b8" strokeWidth="1" opacity="0.4" />
          <line x1="71" y1="87" x2="59" y2="99" stroke="#94a3b8" strokeWidth="1" opacity="0.4" />
        </g>
        <circle cx="65" cy="93" r="13" fill="none" stroke="#334155" strokeWidth="1" strokeDasharray="3 3" />
      </g>

      {/* Ground contact shadow */}
      <ellipse cx="107" cy="108" rx="70" ry="4" fill="black" opacity="0.08" />

      {/* Gradient definitions */}
      <defs>
        <linearGradient id="busShineAnim" x1="30" y1="30" x2="30" y2="90">
          <stop offset="0%" stopColor="white" stopOpacity="0.15" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  </div>
);

/** Animated floating particles */
const FloatingParticles: React.FC = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {Array.from({ length: 15 }).map((_, i) => (
      <div
        key={i}
        className="absolute rounded-full"
        style={{
          width: `${Math.random() * 6 + 2}px`,
          height: `${Math.random() * 6 + 2}px`,
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          background: `rgba(59, 130, 246, ${Math.random() * 0.15 + 0.05})`,
          animation: `particleRise ${Math.random() * 4 + 4}s ease-out ${Math.random() * 4}s infinite`,
        }}
      />
    ))}
  </div>
);

/** Animated road with dashes */
const AnimatedRoad: React.FC = () => (
  <div className="relative w-full h-2 bg-gray-200 rounded-full overflow-hidden">
    <div className="absolute inset-0 flex gap-4 road-dash" style={{ width: '200%' }}>
      {Array.from({ length: 40 }).map((_, i) => (
        <div key={i} className="w-8 h-0.5 bg-yellow-400/70 rounded-full flex-shrink-0 mt-[3px]" />
      ))}
    </div>
  </div>
);

/** Stat counter component with animation */
const StatCounter: React.FC<{ value: string; label: string; delay: number }> = ({ value, label, delay }) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true); },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="text-center"
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
        transition: `all 0.6s ease ${delay}ms`,
      }}
    >
      <div className="text-4xl md:text-5xl font-extrabold text-gradient-blue">{value}</div>
      <div className="text-sm text-gray-500 mt-1">{label}</div>
    </div>
  );
};

/* ====================== MAIN COMPONENT ====================== */

const LandingPage: React.FC<LandingPageProps> = ({
  onNavigateToAuth,
  onNavigateToHome,
  logoUrl = undefined,
  logoAlt = undefined,
  siteTitle = 'EvexTicket',
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [isLoggedIn] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleReserveTicket = () => {
    if (isLoggedIn) {
      onNavigateToHome();
    } else {
      onNavigateToAuth('register');
    }
  };

  const features = [
    {
      icon: <Bus className="w-7 h-7" />,
      title: 'Transport Moderne',
      description: 'Bus climatisés et confortables pour tous vos trajets à travers le Togo.',
      color: 'from-blue-500 to-blue-600',
    },
    {
      icon: <Zap className="w-7 h-7" />,
      title: 'Réservation Instantanée',
      description: "Réservez votre billet en moins de 30 secondes depuis votre téléphone.",
      color: 'from-blue-400 to-cyan-500',
    },
    {
      icon: <MapPin className="w-7 h-7" />,
      title: 'Couverture Nationale',
      description: 'Lomé, Kara, Kpalimé, Sokodé, Atakpamé et bien plus de destinations.',
      color: 'from-blue-500 to-indigo-600',
    },
    {
      icon: <Shield className="w-7 h-7" />,
      title: 'Paiement Sécurisé',
      description: 'Mobile Money, carte bancaire — vos transactions sont chiffrées et sûres.',
      color: 'from-cyan-500 to-blue-600',
    },
    {
      icon: <Clock className="w-7 h-7" />,
      title: 'Horaires Flexibles',
      description: 'Départs fréquents toute la journée pour convenir à votre planning.',
      color: 'from-blue-600 to-blue-700',
    },
    {
      icon: <Users className="w-7 h-7" />,
      title: 'Support 24/7',
      description: 'Une équipe dédiée disponible à tout moment pour vous assister.',
      color: 'from-indigo-500 to-blue-600',
    },
  ];

  const destinations = [
    { name: 'Lomé', subtitle: 'Capitale', image: 'https://i.pinimg.com/736x/9c/cd/6e/9ccd6e29dc537fc53e9a08ee54e9b3a3.jpg' },
    { name: 'Kara', subtitle: 'Nord Togo', image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTFnHDfOQwYE9pg0Xj3xoJdai_oD_sMfZnPLQ&s' },
    { name: 'Atakpamé', subtitle: 'Centre', image: 'https://i.pinimg.com/1200x/fc/4b/8a/fc4b8af0ff5df7825dbfc659685ea477.jpg' },
    { name: 'Sokodé', subtitle: 'Région Centrale', image: 'https://i.pinimg.com/1200x/e1/e1/a3/e1e1a39c9d441c11a4e1955120942222.jpg' },
  ];

  const testimonials = [
    { name: 'A. Koffi', text: 'Réservation simple et service impeccable. Mes trajets vers Kara sont toujours confortables.', rating: 5 },
    { name: 'M. Ahoueke', text: 'Chauffeurs professionnels et bus propres. Je recommande EvexTicket sans hésiter.', rating: 5 },
    { name: 'S. Agbo', text: "Paiement mobile rapide et support réactif. L'avenir du transport au Togo !", rating: 5 },
  ];

  return (
    <div className="landing-page min-h-screen bg-white text-gray-900 overflow-hidden">
      <FloatingParticles />

      {/* ==================== HEADER ==================== */}
      <header
        className={`fixed top-0 w-full z-50 transition-all duration-500 ${
          scrollY > 50
            ? 'bg-white/90 backdrop-blur-xl shadow-sm border-b border-gray-100'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Logo */}
            <div className="flex items-center gap-3">
              {logoUrl ? (
                <img src={logoUrl} alt={logoAlt || 'Logo'} className="w-10 h-10 object-contain rounded-xl" />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/30">
                  <Bus className="w-5 h-5 text-white" />
                </div>
              )}
              <span className="text-xl font-bold tracking-tight">
                <span className="text-gray-900">Evex</span>
                <span className="text-blue-500">Ticket</span>
              </span>
            </div>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-3">
              <button
                onClick={() => onNavigateToAuth('login')}
                className="px-5 py-2.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all duration-300"
              >
                Se connecter
              </button>
              <button
                onClick={() => onNavigateToAuth('register')}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-[1.02] transition-all duration-300"
              >
                S&apos;inscrire gratuitement
              </button>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="md:hidden p-2 rounded-xl text-gray-700 hover:bg-gray-100 transition-colors"
              aria-label="Menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={menuOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden bg-white/95 backdrop-blur-xl border-t border-gray-100 animate-slide-up">
            <div className="px-4 py-5 space-y-3">
              <button
                onClick={() => { setMenuOpen(false); onNavigateToAuth('login'); }}
                className="w-full py-3 text-center text-sm font-medium text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all"
              >
                Se connecter
              </button>
              <button
                onClick={() => { setMenuOpen(false); onNavigateToAuth('register'); }}
                className="w-full py-3 text-center text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl shadow-lg"
              >
                S&apos;inscrire gratuitement
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ==================== HERO SECTION ==================== */}
      <section className="relative pt-32 md:pt-40 pb-20 px-4 sm:px-6 lg:px-8">
        {/* Background blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-blue-100/60 rounded-full blur-[120px] animate-float" />
          <div className="absolute -bottom-60 -left-40 w-[500px] h-[500px] bg-blue-50/80 rounded-full blur-[100px] animate-float-slow" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-cyan-50/50 rounded-full blur-[80px] animate-float-delay" />
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Left: text */}
            <div className="animate-slide-up">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-sm font-medium mb-8">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                Plateforme N°1 au Togo
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.1] mb-6 text-gray-900">
                Voyagez à travers le{' '}
                <span className="text-gradient-blue">Togo</span>{' '}
                en toute{' '}
                <span className="relative inline-block">
                  <span className="text-gradient-blue">simplicité</span>
                  <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 200 12" fill="none">
                    <path d="M2 8C50 2 150 2 198 8" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" opacity="0.4" />
                  </svg>
                </span>
              </h1>

              <p className="text-lg text-gray-500 mb-10 max-w-lg leading-relaxed animate-slide-up-delay">
                Réservez vos billets de bus en quelques secondes. Paiement sécurisé, suivi en temps réel et confort garanti pour chaque trajet.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 animate-slide-up-delay-2">
                <button
                  onClick={handleReserveTicket}
                  className="group relative inline-flex items-center justify-center gap-3 px-8 py-4 text-base font-bold text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl shadow-2xl shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-[1.02] transition-all duration-300 overflow-hidden"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-blue-400 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <span className="relative flex items-center gap-3">
                    Réserver mon ticket
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                </button>
                <button
                  onClick={() => onNavigateToAuth('login')}
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-medium text-gray-700 border border-gray-200 rounded-2xl hover:bg-gray-50 hover:border-gray-300 transition-all duration-300"
                >
                  J&apos;ai déjà un compte
                </button>
              </div>

              {/* Quick stats */}
              <div className="mt-12 flex items-center gap-8">
                <div className="flex -space-x-3">
                  {['bg-blue-400', 'bg-cyan-400', 'bg-blue-500', 'bg-indigo-400'].map((c, i) => (
                    <div key={i} className={`w-10 h-10 rounded-full ${c} border-2 border-white flex items-center justify-center text-xs font-bold text-white shadow-sm`}>
                      {['AK', 'MA', 'SA', 'EK'][i]}
                    </div>
                  ))}
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-900">+5 000 voyageurs</div>
                  <div className="text-xs text-gray-400">nous font confiance</div>
                </div>
              </div>
            </div>

            {/* Right: 3D Bus visual */}
            <div className="relative perspective-1000 animate-fade-in-delay">
              {/* Glow behind bus */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-blue-100/60 rounded-full blur-[60px]" />

              {/* Main bus card */}
              <div className="relative card-3d rounded-3xl overflow-hidden bg-gradient-to-br from-blue-50 to-white border border-gray-100 shadow-xl shadow-blue-500/5 p-8 animate-float">
                {/* Bus SVG */}
                <div className="flex justify-center mb-6">
                  <Bus3D className="w-64" animated={true} color="#3b82f6" />
                </div>

                {/* Road */}
                <AnimatedRoad />

                {/* Ticket preview card */}
                <div className="mt-6 p-4 rounded-2xl bg-white border border-gray-100 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500" />
                      <span className="text-sm font-medium text-gray-700">Lomé</span>
                    </div>
                    <div className="flex-1 mx-3 border-t border-dashed border-gray-300 relative">
                      <Bus className="w-4 h-4 text-blue-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-0.5" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700">Kara</span>
                      <div className="w-3 h-3 rounded-full bg-blue-500" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>06:45 — Départ</span>
                    <span>~7h de trajet</span>
                    <span>7 000 FCFA</span>
                  </div>
                </div>
              </div>

              {/* Floating badge */}
              <div className="absolute -top-4 -right-4 px-4 py-2 rounded-2xl bg-white border border-gray-100 shadow-lg animate-bounce-soft">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-sm font-semibold text-green-600">Confirmé</span>
                </div>
              </div>

              {/* Floating price tag */}
              <div className="absolute -bottom-2 -left-4 px-5 py-3 rounded-2xl bg-white border border-gray-100 shadow-lg animate-float-delay">
                <div className="text-xs text-gray-400">À partir de</div>
                <div className="text-xl font-bold text-gray-900">3 500 <span className="text-sm font-normal text-gray-400">FCFA</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* Animated bus driving across bottom */}
        <div className="absolute bottom-4 left-0 w-full overflow-hidden pointer-events-none opacity-10">
          <div className="animate-bus-drive">
            <Bus3D className="w-32" animated={true} color="#60a5fa" />
          </div>
        </div>
      </section>

      {/* ==================== STATS SECTION ==================== */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 relative">
        <div className="max-w-5xl mx-auto">
          <div className="rounded-3xl bg-gradient-to-br from-blue-50 to-white border border-blue-100/50 p-8 md:p-12 shadow-sm">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <StatCounter value="50+" label="Trajets quotidiens" delay={0} />
              <StatCounter value="5k+" label="Voyageurs actifs" delay={150} />
              <StatCounter value="15+" label="Destinations" delay={300} />
              <StatCounter value="98%" label="Satisfaction" delay={450} />
            </div>
          </div>
        </div>
      </section>

      {/* ==================== FEATURES ==================== */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 right-0 w-[400px] h-[400px] bg-blue-50/60 rounded-full blur-[100px]" />
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-16 animate-slide-up">
            <h2 className="text-3xl md:text-4xl font-extrabold mb-4 text-gray-900">
              Pourquoi choisir{' '}
              <span className="text-gradient-blue">EvexTicket</span> ?
            </h2>
            <p className="text-gray-500 max-w-2xl mx-auto text-lg">
              Une plateforme pensée pour les voyageurs modernes — rapide, sécurisée et conçue pour simplifier vos déplacements.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="feature-card group rounded-2xl bg-white border border-gray-100 p-7 cursor-default shadow-sm hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-400"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  {React.cloneElement(feature.icon, { className: 'w-7 h-7 text-white' })}
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== HOW IT WORKS ==================== */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 relative bg-gray-50/50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold mb-4 text-gray-900">
              Comment ça <span className="text-gradient-blue">marche</span> ?
            </h2>
            <p className="text-gray-500 text-lg">En 3 étapes simples</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[{
              step: '01',
              title: 'Cherchez',
              desc: 'Entrez votre ville de départ, votre destination et la date.',
              icon: <MapPin className="w-6 h-6" />,
            },
            {
              step: '02',
              title: 'Réservez',
              desc: 'Choisissez votre siège et confirmez votre billet.',
              icon: <Bus className="w-6 h-6" />,
            },
            {
              step: '03',
              title: 'Voyagez',
              desc: 'Présentez votre billet numérique et embarquez.',
              icon: <CheckCircle className="w-6 h-6" />,
            }].map((item, i) => (
              <div key={i} className="relative group">
                {i < 2 && (
                  <div className="hidden md:block absolute top-14 left-[calc(50%+60px)] w-[calc(100%-120px)] border-t-2 border-dashed border-blue-200" />
                )}
                <div className="text-center">
                  <div className="relative inline-flex items-center justify-center w-28 h-28 rounded-3xl bg-white border border-gray-100 shadow-sm mb-6 group-hover:scale-105 group-hover:shadow-lg transition-all duration-300">
                    <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center text-xs font-bold text-white shadow-lg">
                      {item.step}
                    </div>
                    <div className="text-blue-500">{item.icon}</div>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-sm text-gray-500">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== DESTINATIONS ==================== */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-blue-50/50 rounded-full blur-[120px]" />
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold mb-4 text-gray-900">
              Découvrez le <span className="text-gradient-blue">Togo</span>
            </h2>
            <p className="text-gray-500 text-lg">Des destinations magnifiques à portée de clic</p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {destinations.map((dest, index) => (
              <div
                key={index}
                className="group relative rounded-2xl overflow-hidden cursor-pointer shadow-sm hover:shadow-xl transition-shadow duration-300"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="aspect-[3/4] overflow-hidden">
                  <img
                    loading="lazy"
                    src={dest.image}
                    alt={dest.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                </div>
                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                {/* Content */}
                <div className="absolute bottom-0 left-0 right-0 p-4 md:p-5">
                  <h3 className="text-lg md:text-xl font-bold text-white">{dest.name}</h3>
                  <p className="text-xs text-white/70">{dest.subtitle}</p>
                  <div className="mt-3 flex items-center gap-1 text-xs text-blue-200 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <span>Explorer</span>
                    <ChevronRight className="w-3 h-3" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== TESTIMONIALS ==================== */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50/50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold mb-4 text-gray-900">
              Ce que disent nos <span className="text-gradient-blue">voyageurs</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <div key={i} className="rounded-2xl bg-white border border-gray-100 p-7 shadow-sm hover:shadow-lg hover:scale-[1.02] transition-all duration-300">
                {/* Stars */}
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: t.rating }).map((_, s) => (
                    <Star key={s} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-600 text-sm leading-relaxed mb-6">&laquo; {t.text} &raquo;</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-sm font-bold text-white">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{t.name}</div>
                    <div className="text-xs text-gray-400">Voyageur vérifié</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== SECURITY SECTION ==================== */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 relative">
        <div className="max-w-6xl mx-auto">
          <div className="rounded-3xl bg-white border border-gray-100 shadow-sm overflow-hidden">
            <div className="grid md:grid-cols-2 gap-0">
              <div className="p-8 md:p-12 flex flex-col justify-center">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-xs font-medium w-fit mb-6">
                  <Shield className="w-3.5 h-3.5" />
                  Sécurité &amp; Fiabilité
                </div>
                <h2 className="text-2xl md:text-3xl font-extrabold mb-4 text-gray-900">Votre sécurité est notre priorité</h2>
                <p className="text-gray-500 mb-8 leading-relaxed">
                  Inspections régulières, conducteurs formés et chiffrement de bout en bout des paiements pour garantir votre sérénité.
                </p>
                <ul className="space-y-4">
                  {[{
                    icon: <Shield className="w-5 h-5 text-blue-500" />,
                    text: 'Véhicules contrôlés et entretenus régulièrement',
                  },
                  {
                    icon: <Users className="w-5 h-5 text-blue-500" />,
                    text: 'Chauffeurs formés et évalués en continu',
                  },
                  {
                    icon: <Lock className="w-5 h-5 text-blue-500" />,
                    text: 'Données et paiements chiffrés SSL',
                  }].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm text-gray-600">
                      <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                        {item.icon}
                      </div>
                      {item.text}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="relative h-64 md:h-auto">
                <img
                  loading="lazy"
                  src="https://i.pinimg.com/1200x/be/d9/5f/bed95f67a0643a9dcd08b39554c52f0e.jpg"
                  alt="Sécurité"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-white/30 to-transparent md:from-white/20" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== CTA SECTION ==================== */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="relative rounded-3xl overflow-hidden p-12 md:p-16">
            {/* Gradient BG */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700" />
            {/* Glow spots */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-400/20 rounded-full blur-[80px]" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-cyan-400/15 rounded-full blur-[60px]" />

            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">
                Prêt à voyager ?
              </h2>
              <p className="text-blue-100/80 text-lg mb-10 max-w-xl mx-auto">
                Rejoignez des milliers de voyageurs qui font confiance à EvexTicket pour leurs déplacements au Togo.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={handleReserveTicket}
                  className="group inline-flex items-center justify-center gap-3 px-8 py-4 text-base font-bold text-blue-600 bg-white rounded-2xl shadow-2xl hover:shadow-white/25 hover:scale-[1.02] transition-all duration-300"
                >
                  Réserver maintenant
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
                <button
                  onClick={() => onNavigateToAuth('register')}
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-medium text-white border-2 border-white/30 rounded-2xl hover:bg-white/10 transition-all duration-300"
                >
                  Créer un compte
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== FOOTER ==================== */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-gray-100 bg-gray-50/50">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-10 mb-10">
            {/* Brand */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                {logoUrl ? (
                  <img src={logoUrl} alt={logoAlt || 'Logo'} className="w-10 h-10 object-contain rounded-xl" />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
                    <Bus className="w-5 h-5 text-white" />
                  </div>
                )}
                <span className="text-xl font-bold">
                  <span className="text-gray-900">Evex</span>
                  <span className="text-blue-500">Ticket</span>
                </span>
              </div>
              <p className="text-sm text-gray-400 max-w-sm leading-relaxed">
                La plateforme de réservation de billets de bus la plus moderne du Togo. Voyagez en toute sérénité.
              </p>
            </div>

            {/* Links */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-4">Liens rapides</h4>
              <ul className="space-y-2.5">
                {['Rechercher un trajet', 'Nos destinations', 'Tarifs'].map((item, i) => (
                  <li key={i}>
                    <button className="text-sm text-gray-400 hover:text-blue-500 transition-colors">{item}</button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-4">Contact</h4>
              <ul className="space-y-2.5">
                <li className="flex items-center gap-2 text-sm text-gray-400">
                  <Phone className="w-4 h-4" />
                  +228 90 00 00 00
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-400">
                  <Mail className="w-4 h-4" />
                  contact@evexticket.tg
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-400">
              © {new Date().getFullYear()} {siteTitle} — Tous droits réservés.
            </p>
            <div className="flex gap-6">
              {['Confidentialité', 'CGU', 'Cookies'].map((item, i) => (
                <button key={i} className="text-xs text-gray-400 hover:text-blue-500 transition-colors">{item}</button>
              ))}
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default LandingPage;
