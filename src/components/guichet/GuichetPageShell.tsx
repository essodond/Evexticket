import React from 'react';

interface GuichetPageShellProps {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

const GuichetPageShell: React.FC<GuichetPageShellProps> = ({ eyebrow = 'Espace guichet', title, description, actions, children }) => (
  <div className="space-y-6">
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600">{eyebrow}</p><h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">{title}</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500 sm:text-base">{description}</p></div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>
    </section>
    {children}
  </div>
);

export default GuichetPageShell;
