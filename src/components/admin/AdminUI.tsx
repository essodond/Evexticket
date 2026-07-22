import React from 'react';
import { AlertCircle, Loader2, X } from 'lucide-react';

export const money = (value: unknown) => `${Number(value || 0).toLocaleString('fr-FR')} FCFA`;
export const number = (value: unknown) => Number(value || 0).toLocaleString('fr-FR');
export const shortDate = (value?: string | null) => value ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(new Date(value)) : '—';
export const dateTime = (value?: string | null) => value ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) : '—';

export const inputClass = 'h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100';
export const selectClass = `${inputClass} appearance-none`;

export const AdminPageShell: React.FC<{
  title: string;
  description: string;
  eyebrow?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, description, eyebrow = 'Administration générale', actions, children }) => (
  <div className="space-y-6">
    <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-blue-600">{eyebrow}</p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>
    </header>
    {children}
  </div>
);

export const AdminMetricCard: React.FC<{
  label: string;
  value: React.ReactNode;
  note?: string;
  icon: React.ReactNode;
  tone?: 'blue' | 'emerald' | 'amber' | 'violet' | 'rose';
}> = ({ label, value, note, icon, tone = 'blue' }) => {
  const tones = {
    blue: 'bg-blue-50 text-blue-700', emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700', violet: 'bg-violet-50 text-violet-700', rose: 'bg-rose-50 text-rose-700',
  };
  return <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tones[tone]}`}>{icon}</div><p className="mt-4 text-sm font-medium text-slate-500">{label}</p><p className="mt-1 text-2xl font-extrabold text-slate-950">{value}</p>{note && <p className="mt-1 text-xs text-slate-400">{note}</p>}</article>;
};

export const StatusBadge: React.FC<{ active?: boolean; label?: string; tone?: 'green' | 'red' | 'amber' | 'blue' | 'slate' }> = ({ active, label, tone }) => {
  const selected = tone || (active ? 'green' : 'red');
  const classes = { green: 'bg-emerald-50 text-emerald-700', red: 'bg-red-50 text-red-700', amber: 'bg-amber-50 text-amber-700', blue: 'bg-blue-50 text-blue-700', slate: 'bg-slate-100 text-slate-600' };
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${classes[selected]}`}>{label || (active ? 'Actif' : 'Suspendu')}</span>;
};

export const AdminLoading: React.FC<{ label?: string }> = ({ label = 'Chargement des données…' }) => <div className="flex items-center justify-center gap-3 rounded-3xl border border-slate-200 bg-white px-6 py-16 text-sm text-slate-500"><Loader2 className="h-5 w-5 animate-spin text-blue-600" />{label}</div>;

export const AdminError: React.FC<{ message: string | null; onRetry?: () => void }> = ({ message, onRetry }) => message ? <div className="flex items-center justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><span className="flex items-center gap-2"><AlertCircle className="h-4 w-4" />{message}</span>{onRetry && <button type="button" onClick={onRetry} className="font-semibold underline">Réessayer</button>}</div> : null;

export const EmptyState: React.FC<{ title: string; description?: string }> = ({ title, description }) => <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center"><p className="font-semibold text-slate-800">{title}</p>{description && <p className="mt-2 text-sm text-slate-500">{description}</p>}</div>;

export const AdminModal: React.FC<{ open: boolean; title: string; description?: string; onClose: () => void; children: React.ReactNode; size?: 'md' | 'lg' }> = ({ open, title, description, onClose, children, size = 'md' }) => {
  if (!open) return null;
  return <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"><div role="dialog" aria-modal="true" className={`max-h-[92vh] w-full overflow-y-auto rounded-3xl bg-white shadow-2xl ${size === 'lg' ? 'max-w-3xl' : 'max-w-xl'}`}><div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-100 bg-white px-6 py-5"><div><h2 className="text-xl font-bold text-slate-950">{title}</h2>{description && <p className="mt-1 text-sm text-slate-500">{description}</p>}</div><button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100" aria-label="Fermer"><X className="h-5 w-5" /></button></div><div className="p-6">{children}</div></div></div>;
};

export const Field: React.FC<{ label: string; children: React.ReactNode; hint?: string }> = ({ label, children, hint }) => <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">{label}</span>{children}{hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}</label>;

export const PrimaryButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ className = '', children, ...props }) => <button {...props} className={`inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}>{children}</button>;

export const SecondaryButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ className = '', children, ...props }) => <button {...props} className={`inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}>{children}</button>;
