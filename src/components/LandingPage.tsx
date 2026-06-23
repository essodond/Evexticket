import React, { useState, useEffect, useRef } from 'react';
import { Bus, MapPin, Clock, Shield, Users, Star, ArrowRight, Lock, Zap, ChevronRight, Phone, Mail, CheckCircle, Search, Ticket, Download, ArrowUpRight } from 'lucide-react';

interface LandingPageProps {
  onNavigateToAuth: (mode: 'login' | 'register') => void;
  onNavigateToHome: () => void;
  logoUrl?: string;
  logoAlt?: string;
  siteTitle?: string;
}

/* ====================== SVG COMPONENTS ====================== */

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

const AppleIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M16.37 12.16c.02 2.28 1.99 3.04 2.01 3.05-.02.05-.31 1.07-1.02 2.11-.61.9-1.25 1.79-2.26 1.81-.99.02-1.31-.59-2.45-.59-1.14 0-1.5.57-2.43.61-.97.04-1.71-.97-2.33-1.87-1.27-1.84-2.24-5.19-.94-7.44.64-1.12 1.78-1.83 3.02-1.85.94-.02 1.83.63 2.45.63.62 0 1.78-.78 3-.66.51.02 1.95.21 2.87 1.56-.07.05-1.71 1-1.69 2.64ZM14.54 5.4c.51-.62.85-1.48.76-2.34-.73.03-1.62.49-2.15 1.11-.47.55-.88 1.42-.77 2.26.81.06 1.65-.41 2.16-1.03Z" />
  </svg>
);

const PlayStoreIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path d="M4 3.5v17l9.45-8.5L4 3.5Z" fill="#34A853" />
    <path d="M13.45 12 17.2 8.62 20.5 10.5c.67.38.67 1.34 0 1.72l-3.3 1.88L13.45 12Z" fill="#FBBC04" />
    <path d="M4 3.5 17.2 8.62 13.45 12 4 3.5Z" fill="#4285F4" />
    <path d="M4 20.5 13.45 12 17.2 15.38 4 20.5Z" fill="#EA4335" />
  </svg>
);

const AndroidIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M7.45 6.14 5.9 3.45l.87-.5 1.58 2.74A8.85 8.85 0 0 1 12 5c1.31 0 2.56.29 3.65.81l1.58-2.74.87.5-1.55 2.69A7 7 0 0 1 19.5 12v5a1.5 1.5 0 0 1-3 0v-5h-1v6.25a1.75 1.75 0 0 1-3.5 0V12h-1v6.25a1.75 1.75 0 0 1-3.5 0V12h-1v5a1.5 1.5 0 0 1-3 0v-5a7 7 0 0 1 2.95-5.86ZM8.5 9a.75.75 0 1 0 0 1.5A.75.75 0 0 0 8.5 9Zm7 0a.75.75 0 1 0 0 1.5A.75.75 0 0 0 15.5 9Z" />
  </svg>
);

const StoreButton: React.FC<{
  title: string;
  subtitle: string;
  dotted?: boolean;
  icon: React.ReactNode;
}> = ({ title, subtitle, dotted = false, icon }) => (
  <button
    className={[
      'group flex min-w-[220px] items-center gap-4 rounded-2xl px-5 py-4 text-left transition-all duration-300',
      dotted
        ? 'border border-dashed border-blue-200 bg-white text-gray-900 hover:border-blue-400 hover:bg-blue-50/60 hover:shadow-[0_20px_60px_rgba(59,130,246,0.10)]'
        : 'bg-[#111111] text-white shadow-[0_18px_40px_rgba(15,23,42,0.16)] hover:-translate-y-0.5 hover:shadow-[0_24px_48px_rgba(15,23,42,0.24)]'
    ].join(' ')}
    type="button"
  >
    <div
      className={[
        'flex h-11 w-11 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-105',
        dotted ? 'bg-blue-50 text-blue-600' : 'bg-white/10 text-white'
      ].join(' ')}
    >
      {icon}
    </div>
    <div className="flex-1">
      <div className={`text-[11px] uppercase tracking-[0.18em] ${dotted ? 'text-gray-400' : 'text-white/55'}`}>
        {subtitle}
      </div>
      <div className={`mt-1 text-sm font-semibold ${dotted ? 'text-gray-900' : 'text-white'}`}>
        {title}
      </div>
    </div>
    <ArrowUpRight className={`h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 ${dotted ? 'text-blue-500' : 'text-white/70'}`} />
  </button>
);

const SearchResultsScreen: React.FC = () => (
  <div className="flex h-full flex-col bg-[#f8fafc]">
    <div className="border-b border-slate-200/80 bg-white px-4 pb-3 pt-4">
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5">
        <Search className="h-4 w-4 text-slate-400" />
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Recherche</div>
          <div className="truncate text-sm font-semibold text-slate-800">Lome to Kara</div>
        </div>
      </div>
    </div>
    <div className="flex-1 space-y-3 p-4">
      {[
        { company: 'Evex Express', time: '06:45', arrival: '13:30', price: '7 000 FCFA', seats: '12 places' },
        { company: 'Kara Premium', time: '08:10', arrival: '15:00', price: '8 500 FCFA', seats: '5 places' },
        { company: 'Nord Connect', time: '10:20', arrival: '17:15', price: '6 500 FCFA', seats: '18 places' },
      ].map((trip) => (
        <div key={`${trip.company}-${trip.time}`} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_14px_30px_rgba(15,23,42,0.05)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-900">{trip.company}</div>
              <div className="mt-1 text-xs text-slate-400">{trip.seats}</div>
            </div>
            <div className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-600">
              Direct
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <div>
              <div className="text-base font-bold text-slate-900">{trip.time}</div>
              <div className="text-[11px] text-slate-400">Lome</div>
            </div>
            <div className="flex-1">
              <div className="relative border-t border-dashed border-slate-300">
                <Bus className="absolute left-1/2 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 bg-white text-blue-500" />
              </div>
            </div>
            <div className="text-right">
              <div className="text-base font-bold text-slate-900">{trip.arrival}</div>
              <div className="text-[11px] text-slate-400">Kara</div>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Prix</div>
            <div className="text-sm font-semibold text-slate-900">{trip.price}</div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const TicketScreen: React.FC = () => (
  <div className="flex h-full flex-col bg-[linear-gradient(180deg,#f8fbff_0%,#eef5ff_100%)] p-4">
    <div className="mb-3 flex items-center justify-between">
      <div>
        <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">E-ticket</div>
        <div className="mt-1 text-sm font-semibold text-slate-900">EvexTicket</div>
      </div>
      <div className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-600">
        Confirmed
      </div>
    </div>
    <div className="rounded-[28px] border border-white/70 bg-white p-4 shadow-[0_18px_40px_rgba(59,130,246,0.12)]">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Trajet</div>
          <div className="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-900">
            <span>Lome</span>
            <ArrowRight className="h-3.5 w-3.5 text-blue-500" />
            <span>Kara</span>
          </div>
        </div>
        <div className="rounded-2xl bg-slate-50 px-3 py-2 text-right">
          <div className="text-[10px] uppercase tracking-[0.14em] text-slate-400">Siege</div>
          <div className="text-sm font-semibold text-slate-900">A12</div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
        <div className="rounded-2xl bg-slate-50 p-3">
          <div className="text-slate-400">Depart</div>
          <div className="mt-1 font-semibold text-slate-900">06:45</div>
        </div>
        <div className="rounded-2xl bg-slate-50 p-3">
          <div className="text-slate-400">Compagnie</div>
          <div className="mt-1 font-semibold text-slate-900">Evex Express</div>
        </div>
      </div>
      <div className="mt-5 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
        <div className="mx-auto grid h-36 w-36 place-items-center rounded-2xl bg-white shadow-inner">
          <div className="relative h-24 w-24">
            <div className="absolute inset-0 grid grid-cols-6 gap-1">
              {Array.from({ length: 36 }).map((_, index) => {
                const filled = [0, 1, 4, 5, 6, 8, 9, 10, 14, 15, 18, 19, 20, 21, 22, 24, 27, 28, 29, 31, 34, 35].includes(index);
                return <div key={index} className={`rounded-[2px] ${filled ? 'bg-slate-900' : 'bg-transparent'}`} />;
              })}
            </div>
          </div>
        </div>
        <div className="mt-3 text-center text-[11px] uppercase tracking-[0.18em] text-slate-400">
          Scan at boarding
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between rounded-2xl bg-blue-50 px-3 py-3">
        <div className="flex items-center gap-2">
          <Ticket className="h-4 w-4 text-blue-600" />
          <span className="text-xs font-medium text-blue-700">Ticket ID</span>
        </div>
        <span className="text-xs font-semibold text-blue-700">EVX-24-8742</span>
      </div>
    </div>
  </div>
);

const PhoneMockup: React.FC<{
  variant: 'search' | 'ticket';
  className?: string;
}> = ({ variant, className = '' }) => (
  <div
    className={[
      'relative h-[560px] w-[280px] rounded-[42px] border border-slate-200/90 bg-[#0f172a] p-[10px] shadow-[0_30px_90px_rgba(15,23,42,0.20)]',
      className
    ].join(' ')}
  >
    <div className="absolute left-1/2 top-[14px] z-20 h-6 w-28 -translate-x-1/2 rounded-full bg-[#0b1220]" />
    <div className="absolute right-[-2px] top-24 h-16 w-1 rounded-l-full bg-slate-300/70" />
    <div className="absolute left-[-2px] top-20 h-10 w-1 rounded-r-full bg-slate-300/70" />
    <div className="absolute left-[-2px] top-36 h-16 w-1 rounded-r-full bg-slate-300/70" />
    <div className="h-full overflow-hidden rounded-[34px] border border-slate-200/70 bg-white">
      {variant === 'search' ? <SearchResultsScreen /> : <TicketScreen />}
    </div>
  </div>
);

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
      tone: 'bg-blue-50 text-blue-600 border-blue-100',
    },
    {
      icon: <Zap className="w-7 h-7" />,
      title: 'Réservation Instantanée',
      description: "Réservez votre billet en moins de 30 secondes depuis votre téléphone.",
      tone: 'bg-sky-50 text-sky-600 border-sky-100',
    },
    {
      icon: <MapPin className="w-7 h-7" />,
      title: 'Couverture Nationale',
      description: 'Lomé, Kara, Kpalimé, Sokodé, Atakpamé et bien plus de destinations.',
      tone: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    },
    {
      icon: <Shield className="w-7 h-7" />,
      title: 'Paiement Sécurisé',
      description: 'Mobile Money, carte bancaire — vos transactions sont chiffrées et sûres.',
      tone: 'bg-cyan-50 text-cyan-700 border-cyan-100',
    },
    {
      icon: <Clock className="w-7 h-7" />,
      title: 'Horaires Flexibles',
      description: 'Départs fréquents toute la journée pour convenir à votre planning.',
      tone: 'bg-blue-50 text-blue-700 border-blue-100',
    },
    {
      icon: <Users className="w-7 h-7" />,
      title: 'Support 24/7',
      description: 'Une équipe dédiée disponible à tout moment pour vous assister.',
      tone: 'bg-violet-50 text-violet-600 border-violet-100',
    },
  ];

  const destinations = [
    {
      name: 'Lomé',
      subtitle: 'Capitale',
      image: 'https://i.pinimg.com/736x/9c/cd/6e/9ccd6e29dc537fc53e9a08ee54e9b3a3.jpg',
      teaser: 'Ville côtière, départs fréquents et ambiance urbaine.',
      travel: 'Départs toute la journée',
      badge: 'Populaire',
      accent: 'text-cyan-400',
      surface: 'from-[#071427] via-[#0a2d56] to-[#020816]',
    },
    {
      name: 'Kara',
      subtitle: 'Nord Togo',
      image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTFnHDfOQwYE9pg0Xj3xoJdai_oD_sMfZnPLQ&s',
      teaser: 'Une destination clé pour les trajets longue distance.',
      travel: 'Environ 7h de trajet',
      badge: 'Long courrier',
      accent: 'text-sky-400',
      surface: 'from-[#18253a] via-[#2c3f5f] to-[#070d18]',
    },
    {
      name: 'Atakpamé',
      subtitle: 'Centre',
      image: 'https://i.pinimg.com/1200x/fc/4b/8a/fc4b8af0ff5df7825dbfc659685ea477.jpg',
      teaser: 'Escapade idéale entre marchés, relief et culture locale.',
      travel: 'Trajet direct disponible',
      badge: 'Week-end',
      accent: 'text-emerald-400',
      surface: 'from-[#1d2738] via-[#394860] to-[#0b1018]',
    },
    {
      name: 'Sokodé',
      subtitle: 'Région Centrale',
      image: 'https://i.pinimg.com/1200x/e1/e1/a3/e1e1a39c9d441c11a4e1955120942222.jpg',
      teaser: 'Un arrêt majeur pour explorer le centre du pays.',
      travel: 'Plusieurs départs par semaine',
      badge: 'Culture',
      accent: 'text-violet-400',
      surface: 'from-[#1b2232] via-[#31415f] to-[#0a0f16]',
    },
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
      <section className="relative overflow-hidden px-4 pb-24 pt-32 sm:px-6 lg:px-8 lg:pb-28 lg:pt-40">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(96,165,250,0.15),transparent_35%),radial-gradient(circle_at_80%_20%,rgba(191,219,254,0.9),transparent_28%),linear-gradient(180deg,#ffffff_0%,#f8fbff_52%,#ffffff_100%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:72px_72px] [mask-image:radial-gradient(circle_at_center,black,transparent_85%)]" />
          <div className="absolute left-[8%] top-[14%] h-48 w-48 rounded-full bg-blue-100/70 blur-[90px]" />
          <div className="absolute bottom-[6%] right-[8%] h-56 w-56 rounded-full bg-slate-100 blur-[110px]" />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl">
          <div className="grid items-center gap-16 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
            <div className="animate-slide-up">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-4 py-2 text-sm font-medium text-blue-600 shadow-sm">
                <span className="h-2 w-2 rounded-full bg-blue-500" />
                Mobile app showcase
              </div>

              <h1 className="mt-8 max-w-2xl text-5xl font-extrabold leading-[0.96] tracking-[-0.04em] text-gray-950 sm:text-6xl lg:text-7xl">
                Vos tickets de bus,
                <br />
                <span className="text-gradient-blue">partout avec vous</span>
              </h1>

              <p className="mt-7 max-w-xl text-lg leading-relaxed text-gray-500 sm:text-xl">
                Découvrez EvexTicket sur mobile avec une expérience fluide, élégante et instantanée pour rechercher vos trajets, réserver et présenter vos billets numériques en un geste.
              </p>

              <div className="mt-10 flex flex-col gap-4 sm:max-w-[540px]">
                <StoreButton
                  title="Download on the App Store"
                  subtitle="iPhone"
                  icon={<AppleIcon />}
                />
                <StoreButton
                  title="Get it on Google Play"
                  subtitle="Android"
                  icon={<PlayStoreIcon />}
                />
                <StoreButton
                  title="Télécharger l'APK"
                  subtitle="Direct install"
                  dotted={true}
                  icon={<AndroidIcon />}
                />
              </div>

              <div className="mt-10 flex flex-wrap items-center gap-4 text-sm text-gray-500">
                <div className="rounded-full border border-gray-200 bg-white px-4 py-2 shadow-sm">
                  Recherche rapide
                </div>
                <div className="rounded-full border border-gray-200 bg-white px-4 py-2 shadow-sm">
                  Billet QR sécurisé
                </div>
                <div className="rounded-full border border-gray-200 bg-white px-4 py-2 shadow-sm">
                  Confirmation instantanée
                </div>
              </div>

              <div className="mt-12 flex flex-col gap-4 sm:flex-row sm:items-center">
                <button
                  onClick={handleReserveTicket}
                  className="inline-flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 px-7 py-4 text-base font-semibold text-white shadow-[0_24px_60px_rgba(59,130,246,0.28)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_28px_72px_rgba(59,130,246,0.34)]"
                >
                  Voir la plateforme
                  <ArrowRight className="h-5 w-5" />
                </button>
                <button
                  onClick={() => onNavigateToAuth('login')}
                  className="inline-flex items-center justify-center rounded-2xl border border-gray-200 bg-white px-7 py-4 text-base font-medium text-gray-700 shadow-sm transition-all duration-300 hover:border-gray-300 hover:bg-gray-50"
                >
                  Se connecter
                </button>
              </div>
            </div>

            <div className="relative flex min-h-[620px] items-center justify-center perspective-1000">
              <div className="absolute inset-x-[12%] top-[14%] h-[380px] rounded-full bg-blue-100/80 blur-[90px]" />
              <div className="absolute bottom-[10%] right-[16%] h-40 w-40 rounded-full bg-slate-200/70 blur-[70px]" />

              <PhoneMockup
                variant="search"
                className="absolute left-0 top-10 hidden rotate-[-12deg] lg:block"
              />

              <PhoneMockup
                variant="ticket"
                className="absolute right-3 top-0 z-10 rotate-[7deg] scale-[1.02]"
              />

              <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 items-center gap-3 rounded-full border border-white/80 bg-white/90 px-5 py-3 shadow-[0_20px_50px_rgba(15,23,42,0.12)] backdrop-blur-xl">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50">
                  <CheckCircle className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Status</div>
                  <div className="text-sm font-semibold text-slate-900">Billet confirmé et prêt à scanner</div>
                </div>
              </div>

              <div className="absolute right-0 top-24 rounded-[28px] border border-slate-200 bg-white/95 px-4 py-3 shadow-[0_18px_45px_rgba(15,23,42,0.10)] backdrop-blur-xl">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50">
                    <Download className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Mobile App</div>
                    <div className="text-sm font-semibold text-slate-900">iOS, Android et APK</div>
                  </div>
                </div>
              </div>
            </div>
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
              <span className="text-blue-600">EvexTicket</span> ?
            </h2>
            <p className="text-gray-500 max-w-2xl mx-auto text-lg">
              Une plateforme pensée pour les voyageurs modernes — rapide, sécurisée et conçue pour simplifier vos déplacements.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="feature-card group rounded-2xl bg-white border border-gray-200/80 p-7 cursor-default shadow-[0_8px_24px_rgba(15,23,42,0.04)] transition-all duration-300"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center mb-5 transition-all duration-300 ${feature.tone}`}>
                  {React.cloneElement(feature.icon, { className: 'w-5 h-5' })}
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-500 leading-7">{feature.description}</p>
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
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="rounded-[32px] border border-gray-200 bg-white px-6 py-8 shadow-[0_22px_70px_rgba(15,23,42,0.06)] md:px-10 md:py-10">
            <div className="mb-10 flex flex-col gap-4 md:mb-12 md:flex-row md:items-end md:justify-between">
              <div className="max-w-2xl">
                <h2 className="text-3xl md:text-4xl font-extrabold text-gray-950">
                  Destinations populaires
                </h2>
                <p className="mt-3 text-lg text-gray-500">
                  Explorez les trajets les plus demandés à travers le Togo avec un <span className="text-blue-500">confort garanti.</span>
                </p>
              </div>
              <div className="hidden md:inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-500">
                <span className="font-medium text-gray-700">Carousel destinations</span>
                <ArrowRight className="h-4 w-4 text-blue-500" />
              </div>
            </div>

            <div className="hide-scrollbar -mx-2 flex snap-x snap-mandatory gap-5 overflow-x-auto px-2 pb-4 md:gap-7">
              {destinations.map((dest, index) => (
                <div
                  key={index}
                  className={`destination-card group relative min-h-[350px] min-w-[290px] snap-start overflow-hidden rounded-[28px] bg-gradient-to-br ${dest.surface} p-5 md:min-h-[380px] md:min-w-[308px]`}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="absolute inset-0 overflow-hidden rounded-[28px]">
                    <img
                      loading="lazy"
                      src={dest.image}
                      alt={dest.name}
                      className="h-full w-full scale-[1.08] object-cover opacity-[0.42] blur-[1px] transition-transform duration-700 group-hover:scale-[1.12]"
                    />
                  </div>
                  <div className="absolute inset-0 rounded-[28px] bg-[radial-gradient(circle_at_center,rgba(148,163,184,0.10),transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.02),rgba(0,0,0,0.22))]" />

                  <div className="relative z-10 flex h-full flex-col">
                    <div className="rounded-full border border-white/12 bg-white/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-sm w-fit">
                      {dest.badge}
                    </div>

                    <div className="mt-auto pr-12">
                      <h3 className="text-2xl font-bold text-white md:text-[26px]">{dest.name}</h3>
                      <p className={`mt-1 text-sm font-medium ${dest.accent}`}>{dest.subtitle}</p>
                      <p className="mt-4 max-w-[92%] text-sm leading-6 text-white/92">
                        {dest.teaser}
                      </p>
                      <div className="mt-5 flex flex-wrap items-center gap-2.5 text-[11px] text-white/85">
                        <div className="inline-flex items-center gap-1.5 rounded-full bg-black/24 px-3 py-1.5 backdrop-blur-sm">
                          <MapPin className="h-3 w-3 text-rose-300" />
                          {dest.name}
                        </div>
                        <div className="inline-flex items-center gap-1.5 rounded-full bg-black/24 px-3 py-1.5 backdrop-blur-sm">
                          <Clock className="h-3 w-3 text-slate-200" />
                          {dest.travel}
                        </div>
                      </div>
                    </div>

                    <div className="absolute bottom-20 right-4 flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/12 text-white shadow-[0_10px_30px_rgba(0,0,0,0.18)] backdrop-blur-sm transition-all duration-300 group-hover:translate-x-1 group-hover:bg-white/16">
                      <ChevronRight className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
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
