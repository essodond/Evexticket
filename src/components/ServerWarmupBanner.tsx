import React from 'react';
import { Server } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

/**
 * Banner shown after 3 seconds when the backend is still cold-starting (Render.com free tier).
 * Lets users know the delay is expected and temporary.
 */
const ServerWarmupBanner: React.FC = () => {
  const { serverStarting } = useAuth();

  if (!serverStarting) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 shadow-lg text-amber-800 text-sm max-w-sm"
    >
      <Server className="w-4 h-4 shrink-0 animate-pulse" />
      <span>Démarrage du serveur en cours, veuillez patienter…</span>
    </div>
  );
};

export default ServerWarmupBanner;
