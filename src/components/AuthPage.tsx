import React, { useState } from 'react';
import { AlertCircle, ArrowLeft, Building2, CheckCircle, Eye, EyeOff, Lock, Mail, Phone, Shield, Ticket, User } from 'lucide-react';
import { AuthPortal, useAuth } from '../contexts/AuthContext';

interface AuthPageProps {
  mode: 'login' | 'register';
  onBack: () => void;
  onSuccess: (user?: any) => void;
  onSwitchMode: (mode: 'login' | 'register') => void;
  logoUrl?: string;
  siteTitle?: string;
  portal?: AuthPortal;
}

const portalCopy = {
  client: {
    title: 'Portail EvexTicket',
    subtitle: 'Voyageurs, administrateurs, compagnies et guichets',
    identifierLabel: 'Numero de telephone',
    identifierPlaceholder: '90 12 34 56',
    secretLabel: 'Code PIN',
    secretPlaceholder: '1234',
    icon: Phone,
    successRouteLabel: 'Se connecter',
  },
  company: {
    title: 'Portail Partenaires',
    subtitle: 'Connexion reservee aux compagnies de bus',
    identifierLabel: 'Email professionnel',
    identifierPlaceholder: 'admin@compagnie.tg',
    secretLabel: 'Mot de passe',
    secretPlaceholder: 'Mot de passe',
    icon: Building2,
    successRouteLabel: 'Acceder au portail compagnie',
  },
  guichet: {
    title: 'Portail Guichet',
    subtitle: 'Connexion réservée aux gestionnaires de guichet',
    identifierLabel: 'Email du gestionnaire',
    identifierPlaceholder: 'guichet@compagnie.tg',
    secretLabel: 'Mot de passe',
    secretPlaceholder: 'Mot de passe',
    icon: Ticket,
    successRouteLabel: 'Accéder au guichet',
  },
  admin: {
    title: 'Portail Global',
    subtitle: 'Connexion super administrateur',
    identifierLabel: 'Email administrateur',
    identifierPlaceholder: 'admin@evex-tg.com',
    secretLabel: 'Mot de passe',
    secretPlaceholder: 'Mot de passe',
    icon: Shield,
    successRouteLabel: 'Acceder au portail global',
  },
};

const normalizeLocalPhone = (value: string) => value.replace(/\D/g, '').replace(/^228/, '').slice(0, 8);

const AuthPage: React.FC<AuthPageProps> = ({
  mode,
  onBack,
  onSuccess,
  onSwitchMode,
  logoUrl,
  siteTitle,
  portal = 'client',
}) => {
  const auth = useAuth();
  const config = portalCopy[portal];
  const PortalIcon = config.icon;
  const isClientPortal = portal === 'client';
  const effectiveMode = isClientPortal ? mode : 'login';
  const [loginMethod, setLoginMethod] = useState<'phone' | 'email'>(portal === 'client' ? 'phone' : 'email');
  const loginByPhone = effectiveMode === 'register' ? true : isClientPortal && loginMethod === 'phone';
  const IdentifierIcon = loginByPhone ? Phone : Mail;

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    identifier: '',
    pinOrPassword: '',
    confirmPin: '',
  });
  const [showSecret, setShowSecret] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const setField = (name: keyof typeof formData, value: string) => {
    const nextValue = loginByPhone && name === 'identifier' ? normalizeLocalPhone(value) : value;
    setFormData((prev) => ({ ...prev, [name]: nextValue }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validateForm = () => {
    const nextErrors: Record<string, string> = {};
    const localPhone = normalizeLocalPhone(formData.identifier);

    if (effectiveMode === 'register') {
      if (!formData.firstName.trim()) nextErrors.firstName = 'Le prenom est requis';
      if (!formData.lastName.trim()) nextErrors.lastName = 'Le nom est requis';
    }

    if (loginByPhone) {
      if (!localPhone) nextErrors.identifier = 'Le numero de telephone est requis';
      if (localPhone && localPhone.length !== 8) nextErrors.identifier = 'Le numero doit contenir 8 chiffres';
      if (!/^\d{4}$/.test(formData.pinOrPassword)) nextErrors.pinOrPassword = 'Le code PIN doit contenir 4 chiffres';
      if (effectiveMode === 'register' && formData.confirmPin !== formData.pinOrPassword) {
        nextErrors.confirmPin = 'Les codes PIN ne correspondent pas';
      }
    } else {
      if (!formData.identifier.trim()) nextErrors.identifier = "L'email est requis";
      if (formData.identifier && !/\S+@\S+\.\S+/.test(formData.identifier)) nextErrors.identifier = 'Email invalide';
      if (!formData.pinOrPassword) nextErrors.pinOrPassword = 'Le mot de passe est requis';
      if (formData.pinOrPassword && formData.pinOrPassword.length < 6) {
        nextErrors.pinOrPassword = 'Le mot de passe doit contenir au moins 6 caracteres';
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      if (effectiveMode === 'register') {
        const user = await auth.register({
          first_name: formData.firstName.trim(),
          last_name: formData.lastName.trim(),
          phone: normalizeLocalPhone(formData.identifier),
          pin: formData.pinOrPassword,
          email: null,
        });
        onSuccess(user);
        return;
      }

      const user = await auth.login(
        loginByPhone ? normalizeLocalPhone(formData.identifier) : formData.identifier.trim(),
        formData.pinOrPassword,
        portal,
      );
      onSuccess(user);
    } catch (error: any) {
      setErrors({ identifier: error.message || 'Connexion impossible' });
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = 'w-full rounded-2xl border bg-white px-4 py-3.5 text-gray-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100';
  const iconInputClass = `${inputClass} pl-12`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50">
      <button
        type="button"
        onClick={onBack}
        className="fixed left-5 top-5 z-20 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-blue-100 bg-white/80 text-gray-500 shadow-sm backdrop-blur transition hover:text-blue-600"
        aria-label="Retour"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>

      <main className="mx-auto grid min-h-screen max-w-6xl grid-cols-1 items-center gap-10 px-6 py-16 lg:grid-cols-[0.9fr_1fr]">
        <section className="hidden lg:block">
          <div className="mb-8 flex items-center gap-4">
            {logoUrl ? (
              <img src={logoUrl} alt={siteTitle || 'EvexTicket'} className="h-16 w-16 rounded-2xl object-cover shadow-md" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md">
                <PortalIcon className="h-8 w-8" />
              </div>
            )}
            <div>
              <h1 className="text-2xl font-extrabold text-gray-950">{siteTitle || 'EvexTicket'}</h1>
              <p className="text-sm font-semibold text-blue-600">{config.title}</p>
            </div>
          </div>

          <h2 className="max-w-md text-4xl font-extrabold leading-tight text-gray-950">
            {isClientPortal ? 'Reservez, payez et retrouvez vos tickets facilement.' : 'Acces securise aux operations EVEX.'}
          </h2>
          <p className="mt-5 max-w-md text-lg leading-8 text-gray-600">{config.subtitle}</p>
        </section>

        <section className="mx-auto w-full max-w-xl">
          <div className="rounded-3xl border border-blue-100 bg-white/85 p-7 shadow-xl shadow-blue-100/60 backdrop-blur sm:p-10">
            <div className="mb-8">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                <PortalIcon className="h-6 w-6" />
              </div>
              <h2 className="text-3xl font-extrabold text-gray-950">
                {effectiveMode === 'register' ? 'Creer un compte voyageur' : config.title}
              </h2>
              <p className="mt-2 text-gray-500">
                {effectiveMode === 'register'
                  ? 'Compte client avec telephone et code PIN.'
                  : isClientPortal
                    ? 'Voyageurs : telephone + PIN. Administrateurs : email + mot de passe.'
                    : config.subtitle}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {effectiveMode === 'login' && isClientPortal && (
                <div className="flex flex-col gap-2 rounded-3xl border border-blue-100 bg-blue-50 p-3 text-sm text-gray-700">
                  <span className="font-semibold text-gray-900">Mode de connexion</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setLoginMethod('phone')}
                      className={`${loginMethod === 'phone' ? 'bg-white text-blue-700 shadow-sm' : 'bg-blue-100 text-blue-600'} flex-1 rounded-2xl px-4 py-3 text-sm font-medium transition flex items-center justify-center gap-2`}
                    >
                      {loginMethod === 'phone' && <CheckCircle className="h-4 w-4 text-green-500" />}
                      Téléphone + PIN
                    </button>
                    <button
                      type="button"
                      onClick={() => setLoginMethod('email')}
                      className={`${loginMethod === 'email' ? 'bg-white text-blue-700 shadow-sm' : 'bg-blue-100 text-blue-600'} flex-1 rounded-2xl px-4 py-3 text-sm font-medium transition flex items-center justify-center gap-2`}
                    >
                      {loginMethod === 'email' && <CheckCircle className="h-4 w-4 text-green-500" />}
                      Email + mot de passe
                    </button>
                  </div>
                </div>
              )}
              {effectiveMode === 'register' && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-gray-700" htmlFor="firstName">Prenom</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-blue-400" />
                      <input id="firstName" className={iconInputClass} value={formData.firstName} onChange={(e) => setField('firstName', e.target.value)} />
                    </div>
                    {errors.firstName && <ErrorText message={errors.firstName} />}
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-gray-700" htmlFor="lastName">Nom</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-blue-400" />
                      <input id="lastName" className={iconInputClass} value={formData.lastName} onChange={(e) => setField('lastName', e.target.value)} />
                    </div>
                    {errors.lastName && <ErrorText message={errors.lastName} />}
                  </div>
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700" htmlFor="identifier">{loginByPhone ? 'Numero de telephone' : 'Email'}</label>
                <div className="relative">
                  <IdentifierIcon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-blue-400" />
                  <input
                    id="identifier"
                    type={loginByPhone ? 'tel' : 'email'}
                    inputMode={loginByPhone ? 'numeric' : 'email'}
                    autoComplete={loginByPhone ? 'tel' : 'email'}
                    className={iconInputClass}
                    value={formData.identifier}
                    onChange={(e) => setField('identifier', e.target.value)}
                    placeholder={loginByPhone ? '90 12 34 56' : 'admin@exemple.com'}
                  />
                </div>
                {errors.identifier && <ErrorText message={errors.identifier} />}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700" htmlFor="pinOrPassword">{loginByPhone ? 'Code PIN' : 'Mot de passe'}</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-blue-400" />
                  <input
                    id="pinOrPassword"
                    type={showSecret ? 'text' : 'password'}
                    inputMode={loginByPhone ? 'numeric' : 'text'}
                    autoComplete={loginByPhone ? 'one-time-code' : 'current-password'}
                    maxLength={loginByPhone ? 4 : undefined}
                    className={`${iconInputClass} pr-12`}
                    value={formData.pinOrPassword}
                    onChange={(e) => setField('pinOrPassword', loginByPhone ? e.target.value.replace(/\D/g, '').slice(0, 4) : e.target.value)}
                    placeholder={loginByPhone ? '1234' : 'Mot de passe'}
                  />
                  <button type="button" onClick={() => setShowSecret((value) => !value)} className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-400 transition hover:text-blue-600">
                    {showSecret ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {errors.pinOrPassword && <ErrorText message={errors.pinOrPassword} />}
              </div>

              {effectiveMode === 'register' && (
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700" htmlFor="confirmPin">Confirmer le code PIN</label>
                  <input
                    id="confirmPin"
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    className={inputClass}
                    value={formData.confirmPin}
                    onChange={(e) => setField('confirmPin', e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="1234"
                  />
                  {errors.confirmPin && <ErrorText message={errors.confirmPin} />}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-4 text-base font-bold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? 'Connexion...' : effectiveMode === 'register' ? 'Creer mon compte' : config.successRouteLabel}
                {!isLoading && <CheckCircle className="h-5 w-5" />}
              </button>

              {isClientPortal && (
                <p className="text-center text-sm text-gray-600">
                  {effectiveMode === 'login' ? 'Pas encore de compte ?' : 'Deja inscrit ?'}
                  <button
                    type="button"
                    onClick={() => onSwitchMode(effectiveMode === 'login' ? 'register' : 'login')}
                    className="ml-2 font-bold text-blue-600 transition hover:text-blue-700"
                  >
                    {effectiveMode === 'login' ? "S'inscrire" : 'Se connecter'}
                  </button>
                </p>
              )}
            </form>
          </div>
        </section>
      </main>
    </div>
  );
};

const ErrorText: React.FC<{ message: string }> = ({ message }) => (
  <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-red-600">
    <AlertCircle className="h-3.5 w-3.5" />
    {message}
  </p>
);

export default AuthPage;
