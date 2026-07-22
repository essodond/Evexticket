import React from 'react';
import { Plus, Power, Users } from 'lucide-react';
import type { GuichetAgent } from '../services/api';

interface GuichetAgentsSectionProps {
  agents: GuichetAgent[];
  loading?: boolean;
  togglingAgentId?: number | null;
  onCreate: () => void;
  onToggle: (agent: GuichetAgent) => void;
}

const GuichetAgentsSection: React.FC<GuichetAgentsSectionProps> = ({
  agents,
  loading = false,
  togglingAgentId = null,
  onCreate,
  onToggle,
}) => {
  const activeAgents = agents.filter((agent) => agent.actif).length;
  const salesToday = agents.reduce((sum, agent) => sum + agent.nb_ventes_aujourd_hui, 0);
  const totalSales = agents.reduce((sum, agent) => sum + agent.nb_ventes_total, 0);

  return (
    <section id="agents" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm scroll-mt-24">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">Équipe guichet</p>
          <h2 className="mt-2 text-xl font-semibold text-slate-900">Gestionnaires de guichet</h2>
          <p className="mt-1 text-sm text-slate-500">Gérez les accès et suivez les ventes de chaque gestionnaire.</p>
        </div>
        <button
          type="button"
          onClick={onCreate}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Nouveau gestionnaire
        </button>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Metric label="Agents actifs" value={`${activeAgents}/${agents.length}`} />
        <Metric label="Ventes aujourd’hui" value={salesToday.toLocaleString('fr-FR')} />
        <Metric label="Ventes cumulées" value={totalSales.toLocaleString('fr-FR')} />
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <HeaderCell>Gestionnaire</HeaderCell>
              <HeaderCell>Contact</HeaderCell>
              <HeaderCell>Affectation</HeaderCell>
              <HeaderCell>Ventes aujourd’hui</HeaderCell>
              <HeaderCell>Total ventes</HeaderCell>
              <HeaderCell>Statut</HeaderCell>
              <HeaderCell align="right">Action</HeaderCell>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {loading && (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-sm text-slate-500">Chargement des gestionnaires…</td>
              </tr>
            )}
            {!loading && agents.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center">
                  <Users className="mx-auto h-8 w-8 text-slate-300" />
                  <p className="mt-3 text-sm font-medium text-slate-700">Aucun gestionnaire créé</p>
                  <p className="mt-1 text-xs text-slate-500">Créez le premier accès guichet de votre compagnie.</p>
                </td>
              </tr>
            )}
            {!loading && agents.map((agent) => (
              <tr key={agent.id} className="hover:bg-slate-50/70">
                <td className="whitespace-nowrap px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-sm font-bold text-blue-700">
                      {(agent.prenom?.[0] || agent.nom?.[0] || 'G').toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{agent.prenom} {agent.nom}</div>
                      <div className="text-xs text-slate-500">ID #{agent.id}</div>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <div className="text-sm text-slate-700">{agent.email}</div>
                  <div className="text-xs text-slate-500">{agent.telephone}</div>
                </td>
                <td className="px-5 py-4">
                  <div className="text-sm font-medium text-slate-700">{agent.agence?.nom || 'Non affecté'}</div>
                  <div className="text-xs text-slate-500">{agent.guichet ? `${agent.guichet.code} · ${agent.guichet.nom}` : agent.agence ? 'Agence uniquement' : '—'}</div>
                </td>
                <td className="px-5 py-4 text-sm font-semibold text-slate-900">{agent.nb_ventes_aujourd_hui}</td>
                <td className="px-5 py-4 text-sm text-slate-700">{agent.nb_ventes_total}</td>
                <td className="px-5 py-4">
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                    agent.actif ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {agent.actif ? 'Actif' : 'Désactivé'}
                  </span>
                </td>
                <td className="px-5 py-4 text-right">
                  <button
                    type="button"
                    disabled={togglingAgentId === agent.id}
                    onClick={() => onToggle(agent)}
                    className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition disabled:opacity-50 ${
                      agent.actif
                        ? 'border-red-200 text-red-700 hover:bg-red-50'
                        : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                    }`}
                  >
                    <Power className="h-3.5 w-3.5" />
                    {togglingAgentId === agent.id ? 'Mise à jour…' : agent.actif ? 'Désactiver' : 'Activer'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

const Metric: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-2xl bg-slate-50 px-4 py-3">
    <div className="text-xs font-medium text-slate-500">{label}</div>
    <div className="mt-1 text-xl font-bold text-slate-900">{value}</div>
  </div>
);

const HeaderCell: React.FC<{ children: React.ReactNode; align?: 'left' | 'right' }> = ({ children, align = 'left' }) => (
  <th className={`px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 ${align === 'right' ? 'text-right' : 'text-left'}`}>{children}</th>
);

export default GuichetAgentsSection;
