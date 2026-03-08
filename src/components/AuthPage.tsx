import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Bus, ArrowLeft, Eye, EyeOff, CheckCircle, AlertCircle, Mail, Lock, User, Phone as PhoneIcon } from 'lucide-react';

interface AuthPageProps {
  mode: 'login' | 'register';
  onBack: () => void;
  onSuccess: (user?: any) => void;
  onSwitchMode: (mode: 'login' | 'register') => void;
  logoUrl?: string;
  siteTitle?: string;
}

const AuthPage: React.FC<AuthPageProps> = ({ mode, onBack, onSuccess, onSwitchMode, logoUrl, siteTitle }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Handle 3D tilt effect on mouse move
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setMousePosition({ x, y });
  };

  const handleMouseLeave = () => {
    setMousePosition({ x: 0.5, y: 0.5 });
  };

  // Calculate 3D transform based on mouse position
  const getTilt3D = () => {
    const rotateX = (mousePosition.y - 0.5) * 8;
    const rotateY = (mousePosition.x - 0.5) * -8;
    return `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.01)`;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (mode === 'register') {
      if (!formData.firstName.trim()) newErrors.firstName = 'Le prénom est requis';
      if (!formData.lastName.trim()) newErrors.lastName = 'Le nom est requis';
      if (!formData.phone.trim()) newErrors.phone = 'Le téléphone est requis';
      // Validation de l'email en mode inscription
      if (!formData.email.trim()) {
        newErrors.email = "L'email est requis";
      } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
        newErrors.email = "L'email n'est pas valide";
      }
    } else {
      // Mode login: identifiant peut être email ou numéro de téléphone
      const ident = formData.email.trim();
      if (!ident) {
        newErrors.email = 'Identifiant requis';
      } else if (ident.includes('@')) {
        if (!/\S+@\S+\.\S+/.test(ident)) {
          newErrors.email = "Email invalide";
        }
      } else {
        const digits = ident.replace(/[^0-9]/g, '');
        if (digits.length < 6) {
          newErrors.email = 'Numéro de téléphone invalide';
        }
      }
    }

    if (!formData.password) {
      newErrors.password = 'Le mot de passe est requis';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Le mot de passe doit contenir au moins 6 caractères';
    }

    if (mode === 'register') {
      if (!formData.confirmPassword) {
        newErrors.confirmPassword = 'Confirmez votre mot de passe';
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Les mots de passe ne correspondent pas';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const auth = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);
    // NOTE: Login/Register utilisent `apiService` qui interagit avec le backend Django.
    // - `apiService.login()` doit récupérer un token auprès du backend et le stocker
    //   via `apiService.setAuthToken(token)` (déjà fait dans apiService.login).
    // - Après la connexion, `App` appellera `/me/` pour récupérer l'utilisateur et
    //   décider quelle vue afficher (admin vs company dashboard).
    if (mode === 'register') {
      try {
        const respUser = await auth.register({
          username: formData.email,
          email: formData.email,
          password: formData.password,
          password2: formData.confirmPassword,
          first_name: formData.firstName,
          last_name: formData.lastName,
          phone: formData.phone,
        });
        setIsLoading(false);
        onSuccess(respUser);
      } catch (error: any) {
        setIsLoading(false);
        setErrors({ email: error.message || 'Erreur lors de la création du compte' });
      }
    } else {
      try {
        const respUser = await auth.login(formData.email, formData.password);
        setIsLoading(false);
        onSuccess(respUser);
      } catch (error: any) {
        setIsLoading(false);
        setErrors({ email: error.message || 'Erreur lors de la connexion' });
      }
    }
  };

  const inputBase = "w-full pl-12 pr-5 py-3.5 bg-white/40 backdrop-blur-md border rounded-2xl text-base text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400 transition-all duration-300";
  const inputError = "border-red-300 focus:ring-red-400/40 focus:border-red-400";
  const inputNormal = "border-blue-100/60 hover:border-blue-200";

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-blue-50 via-white to-blue-50/50 relative overflow-hidden auth-perspective">
      {/* Animated bus driving background - slowly like landing page */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Small bus rolling slowly from left to right */}
        <div className="absolute bottom-1/3 left-0 w-full overflow-hidden pointer-events-none">
          <div className="animate-bus-drive">
            <svg viewBox="0 0 220 130" className="w-24 h-auto opacity-20" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Bus body */}
              <rect x="30" y="30" width="155" height="60" rx="12" fill="#3b82f6" />
              <rect x="30" y="30" width="155" height="60" rx="12" fill="url(#busShineAnim)" opacity="0.3" />

              {/* Windows */}
              <circle cx="55" cy="45" r="8" fill="#bfdbfe" opacity="0.8" />
              <rect x="70" y="38" width="16" height="16" rx="2" fill="#bfdbfe" opacity="0.8" />
              <rect x="93" y="38" width="16" height="16" rx="2" fill="#bfdbfe" opacity="0.8" />
              <rect x="116" y="38" width="16" height="16" rx="2" fill="#bfdbfe" opacity="0.8" />
              <rect x="139" y="38" width="16" height="16" rx="2" fill="#bfdbfe" opacity="0.8" />

              {/* Door line */}
              <line x1="78" y1="30" x2="78" y2="90" stroke="#0f172a" strokeWidth="1" opacity="0.3" />

              {/* Wheels */}
              <g>
                <circle cx="55" cy="93" r="13" fill="#1f2937" />
                <g>
                  <animateTransform attributeName="transform" type="rotate" from="0 55 93" to="360 55 93" dur="0.6s" repeatCount="indefinite" />
                  <line x1="55" y1="81" x2="55" y2="105" stroke="#374151" strokeWidth="1.5" />
                  <line x1="43" y1="93" x2="67" y2="93" stroke="#374151" strokeWidth="1.5" />
                  <line x1="46" y1="84" x2="64" y2="102" stroke="#374151" strokeWidth="1.5" />
                  <line x1="64" y1="84" x2="46" y2="102" stroke="#374151" strokeWidth="1.5" />
                </g>
                <circle cx="55" cy="93" r="5" fill="#60a5fa" />
              </g>
              <g>
                <circle cx="165" cy="93" r="13" fill="#1f2937" />
                <g>
                  <animateTransform attributeName="transform" type="rotate" from="0 165 93" to="360 165 93" dur="0.6s" repeatCount="indefinite" />
                  <line x1="165" y1="81" x2="165" y2="105" stroke="#374151" strokeWidth="1.5" />
                  <line x1="153" y1="93" x2="177" y2="93" stroke="#374151" strokeWidth="1.5" />
                  <line x1="156" y1="84" x2="174" y2="102" stroke="#374151" strokeWidth="1.5" />
                  <line x1="174" y1="84" x2="156" y2="102" stroke="#374151" strokeWidth="1.5" />
                </g>
                <circle cx="165" cy="93" r="5" fill="#60a5fa" />
              </g>

              {/* Headlight */}
              <circle cx="32" cy="48" r="5" fill="#fbbf24" className="headlight-glow" />

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
        </div>
      </div>

      {/* Animated background blobs — bleu transparent */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-blue-200/30 rounded-full blur-[120px] animate-float animate-morph-blob" />
        <div className="absolute -bottom-40 -left-40 w-[450px] h-[450px] bg-blue-100/40 rounded-full blur-[100px] animate-float-slow animate-morph-blob-2" />
        <div className="absolute top-1/4 left-1/3 w-[300px] h-[300px] bg-cyan-100/25 rounded-full blur-[90px] animate-float-delay" />
        <div className="absolute bottom-1/4 right-1/4 w-[250px] h-[250px] bg-blue-300/15 rounded-full blur-[80px] animate-float" />
      </div>

      {/* Back button */}
      <button
        onClick={onBack}
        className="absolute left-6 top-6 p-2.5 rounded-xl text-gray-500 hover:text-blue-600 hover:bg-blue-50/60 backdrop-blur-sm transition-all duration-300 z-20 border border-blue-100/40 animate-slide-in-left"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      {/* Left side — Info panel (visible on lg+) */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center items-center px-16 relative z-10">
        <div className="max-w-md">
          {/* Logo large with 3D float */}
          <div className="flex items-center gap-4 mb-10 animate-slide-in-left">
            {logoUrl ? (
              <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-lg shadow-blue-500/20 border-2 border-white/60 auth-bus-3d">
                <img src={logoUrl} alt={siteTitle || "Logo"} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/25 auth-bus-3d">
                <Bus className="w-8 h-8 text-white" />
              </div>
            )}
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900">{siteTitle || 'EvexTicket'}</h1>
              <p className="text-blue-500 text-sm font-medium">Voyagez en toute simplicité</p>
            </div>
          </div>

          <h2 className="text-4xl font-extrabold text-gray-900 leading-tight mb-6 animate-slide-in-left" style={{ animationDelay: '0.1s' }}>
            {mode === 'login'
              ? 'Retrouvez vos voyages en un clic'
              : 'Commencez votre aventure'}
          </h2>
          <p className="text-gray-500 text-lg leading-relaxed mb-10 animate-slide-in-left" style={{ animationDelay: '0.2s' }}>
            {mode === 'login'
              ? 'Accédez à vos réservations, consultez vos billets et planifiez votre prochain trajet.'
              : 'Créez votre compte et profitez de réservations rapides, de tarifs avantageux et d\'un suivi en temps réel de vos voyages.'}
          </p>

          {/* Feature highlights with stagger animation */}
          <div className="space-y-5">
            <div className="flex items-start gap-4 auth-feature-card animate-stagger-1">
              <div className="w-11 h-11 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                <Bus className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-800">Réservation instantanée</h3>
                <p className="text-sm text-gray-500 mt-0.5">Choisissez votre siège et réservez en quelques secondes</p>
              </div>
            </div>
            <div className="flex items-start gap-4 auth-feature-card animate-stagger-2">
              <div className="w-11 h-11 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-800">Billets numériques</h3>
                <p className="text-sm text-gray-500 mt-0.5">Retrouvez vos billets avec QR code directement sur votre téléphone</p>
              </div>
            </div>
            <div className="flex items-start gap-4 auth-feature-card animate-stagger-3">
              <div className="w-11 h-11 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                <Lock className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-800">Paiement sécurisé</h3>
                <p className="text-sm text-gray-500 mt-0.5">Flooz, T-Money ou carte bancaire — à vous de choisir</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side — Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 sm:px-10 py-12 relative z-10" onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
        <div className="w-full max-w-lg">
          {/* Mobile header (hidden on lg+) */}
          <div className="lg:hidden text-center mb-8 animate-slide-in-right">
            <div className="flex justify-center mb-4 animate-scale-in">
              {logoUrl ? (
                <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-lg shadow-blue-500/15 border-2 border-white/60 auth-bus-3d">
                  <img src={logoUrl} alt={siteTitle || "Logo"} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/25 auth-bus-3d">
                  <Bus className="w-8 h-8 text-white" />
                </div>
              )}
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
              {mode === 'login' ? 'Content de vous revoir' : 'Créer un compte'}
            </h2>
            <p className="mt-2 text-gray-500 text-base">
              {mode === 'login'
                ? `Connectez-vous à ${siteTitle || 'EvexTicket'}`
                : `Rejoignez ${siteTitle || 'EvexTicket'} et voyagez facilement`}
            </p>
          </div>

          {/* Desktop header inside card (visible on lg+) */}
          <div className="hidden lg:block mb-8 animate-slide-in-right">
            <h2 className="text-3xl font-extrabold text-gray-900">
              {mode === 'login' ? 'Connexion' : 'Créer un compte'}
            </h2>
            <p className="mt-2 text-gray-500 text-base">
              {mode === 'login'
                ? 'Entrez vos identifiants pour accéder à votre espace'
                : 'Remplissez le formulaire pour commencer'}
            </p>
          </div>

          {/* Glass card form — bleu transparent with 3D tilt */}
          <div className="relative animate-scale-in" style={{ transitionDelay: '0.3s' }}>
            {/* Card glow */}
            <div className="absolute -inset-2 bg-gradient-to-br from-blue-300/20 via-blue-100/10 to-cyan-200/15 rounded-3xl blur-xl animate-glow-ring" />

            <form
              onSubmit={handleSubmit}
              className="relative auth-card-3d auth-shimmer backdrop-blur-2xl border border-blue-200/40 shadow-[0_8px_60px_-12px_rgba(59,130,246,0.15)] rounded-3xl p-8 sm:p-10 space-y-5"
              style={{
                background: 'linear-gradient(145deg, rgba(219,234,254,0.35) 0%, rgba(255,255,255,0.55) 40%, rgba(219,234,254,0.25) 100%)',
                transform: getTilt3D(),
                transition: 'transform 0.15s ease-out'
              }}
            >
              {mode === 'register' && (
                <>
                  {/* Name fields */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="auth-input-3d animate-stagger-1">
                      <label htmlFor="firstName" className="block text-sm font-semibold text-gray-700 mb-1.5 ml-0.5">
                        Prénom
                      </label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-400/70" />
                        <input
                          id="firstName"
                          name="firstName"
                          type="text"
                          value={formData.firstName}
                          onChange={handleInputChange}
                          className={`${inputBase} ${errors.firstName ? inputError : inputNormal}`}
                          placeholder="Prénom"
                        />
                      </div>
                      {errors.firstName && (
                        <p className="mt-1.5 text-xs text-red-500 flex items-center ml-1 animate-slide-up">
                          <AlertCircle className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
                          {errors.firstName}
                        </p>
                      )}
                    </div>
                    <div className="auth-input-3d animate-stagger-2">
                      <label htmlFor="lastName" className="block text-sm font-semibold text-gray-700 mb-1.5 ml-0.5">
                        Nom
                      </label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-400/70" />
                        <input
                          id="lastName"
                          name="lastName"
                          type="text"
                          value={formData.lastName}
                          onChange={handleInputChange}
                          className={`${inputBase} ${errors.lastName ? inputError : inputNormal}`}
                          placeholder="Nom"
                        />
                      </div>
                      {errors.lastName && (
                        <p className="mt-1.5 text-xs text-red-500 flex items-center ml-1 animate-slide-up">
                          <AlertCircle className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
                          {errors.lastName}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="auth-input-3d animate-stagger-3">
                    <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 mb-1.5 ml-0.5">
                      Téléphone
                    </label>
                    <div className="relative">
                      <PhoneIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-400/70" />
                      <input
                        id="phone"
                        name="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className={`${inputBase} ${errors.phone ? inputError : inputNormal}`}
                        placeholder="+228 XX XX XX XX"
                      />
                    </div>
                    {errors.phone && (
                      <p className="mt-1.5 text-xs text-red-500 flex items-center ml-1 animate-slide-up">
                        <AlertCircle className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
                        {errors.phone}
                      </p>
                    )}
                  </div>
                </>
              )}

              {/* Email / Identifier */}
              <div className="auth-input-3d animate-stagger-4">
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-1.5 ml-0.5">
                  {mode === 'login' ? 'Email ou téléphone' : 'Adresse email'}
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-400/70" />
                  <input
                    id="email"
                    name="email"
                    type={mode === 'login' ? 'text' : 'email'}
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`${inputBase} ${errors.email ? inputError : inputNormal}`}
                    placeholder={mode === 'login' ? 'email@exemple.com ou +228...' : 'votre@email.com'}
                  />
                </div>
                {errors.email && (
                  <p className="mt-1.5 text-xs text-red-500 flex items-center ml-1 animate-slide-up">
                    <AlertCircle className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
                    {errors.email}
                  </p>
                )}
              </div>

              {/* Password */}
              <div className="auth-input-3d animate-stagger-5">
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-1.5 ml-0.5">
                  Mot de passe
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-400/70" />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={handleInputChange}
                    className={`${inputBase} !pr-12 ${errors.password ? inputError : inputNormal}`}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-blue-400/60 hover:text-blue-500 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1.5 text-xs text-red-500 flex items-center ml-1 animate-slide-up">
                    <AlertCircle className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
                    {errors.password}
                  </p>
                )}
              </div>

              {/* Confirm password */}
              {mode === 'register' && (
                <div className="auth-input-3d animate-stagger-6">
                  <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 mb-1.5 ml-0.5">
                    Confirmer le mot de passe
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-400/70" />
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      className={`${inputBase} !pr-12 ${errors.confirmPassword ? inputError : inputNormal}`}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-blue-400/60 hover:text-blue-500 transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="mt-1.5 text-xs text-red-500 flex items-center ml-1 animate-slide-up">
                      <AlertCircle className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
                      {errors.confirmPassword}
                    </p>
                  )}
                </div>
              )}

              {/* Forgot password link (login only) */}
              {mode === 'login' && (
                <div className="flex justify-end animate-stagger-5">
                  <button type="button" className="text-sm text-blue-500 hover:text-blue-600 font-medium transition-colors">
                    Mot de passe oublié ?
                  </button>
                </div>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2.5 py-4 px-8 text-base font-bold text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 animate-stagger-6"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {mode === 'login' ? 'Connexion...' : 'Création...'}
                  </>
                ) : (
                  <>
                    {mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
                    <CheckCircle className="w-5 h-5" />
                  </>
                )}
              </button>

              {/* Divider */}
              <div className="relative py-1">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-blue-200/40" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-blue-50/40 backdrop-blur-sm px-4 text-gray-400">ou</span>
                </div>
              </div>

              {/* Switch mode */}
              <p className="text-center text-base text-gray-600">
                {mode === 'login' ? "Pas encore de compte ?" : "Déjà un compte ?"}
                <button
                  type="button"
                  onClick={() => onSwitchMode(mode === 'login' ? 'register' : 'login')}
                  className="ml-2 text-blue-500 hover:text-blue-600 font-bold transition-colors"
                >
                  {mode === 'login' ? "S'inscrire" : 'Se connecter'}
                </button>
              </p>
            </form>
          </div>

          {/* Trust badges — mobile */}
          <div className="lg:hidden mt-8 flex justify-center gap-6 animate-fade-in">
            <div className="flex items-center gap-2 text-gray-400">
              <Lock className="w-4 h-4" />
              <span className="text-xs font-medium">Sécurisé</span>
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <CheckCircle className="w-4 h-4" />
              <span className="text-xs font-medium">Fiable</span>
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <Bus className="w-4 h-4" />
              <span className="text-xs font-medium">+100 trajets</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
