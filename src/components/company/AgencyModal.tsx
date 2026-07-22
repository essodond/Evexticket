import React, { useEffect, useState } from 'react';
import { Building2, MapPin, Phone, UserRound, X } from 'lucide-react';
import apiService from '../../services/api';
import type { Agency, AgencyPayload, City, GuichetAgent } from '../../services/api';

const fieldClass = 'w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100';

interface AgencyModalProps {
  open: boolean;
  agency?: Agency | null;
  cities: City[];
  agents: GuichetAgent[];
  onClose: () => void;
  onSaved: (agency: Agency) => void;
}

const AgencyModal: React.FC<AgencyModalProps> = ({ open, agency, cities, agents, onClose, onSaved }) => {
  const [form, setForm] = useState({ nom: '', ville_id: '', adresse: '', telephone: '', gestionnaire_id: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setForm({
      nom: agency?.nom || '',
      ville_id: agency?.ville?.id ? String(agency.ville.id) : '',
      adresse: agency?.adresse || '',
      telephone: agency?.telephone || '',
      gestionnaire_id: agency?.gestionnaire?.id ? String(agency.gestionnaire.id) : '',
    });
    setError(null);
  }, [agency, open]);

  if (!open) return null;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const payload: AgencyPayload = {
      nom: form.nom.trim(),
      ville_id: Number(form.ville_id),
      adresse: form.adresse.trim(),
      telephone: form.telephone.trim(),
      gestionnaire_id: form.gestionnaire_id ? Number(form.gestionnaire_id) : null,
    };
    try {
      const saved = agency
        ? await apiService.updateCompanyAgency(agency.id, payload)
        : await apiService.createCompanyAgency(payload);
      onSaved(saved);
    } catch (saveError: any) {
      setError(saveError?.message || "Impossible d'enregistrer l'agence.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={agency ? "Modifier l'agence" : 'Créer une agence'}>
      <div className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">Agence physique</p><h2 className="mt-1 text-xl font-bold text-slate-900">{agency ? "Modifier l'agence" : 'Nouvelle agence'}</h2></div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Fermer"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={submit} className="space-y-5 p-6">
          {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
          <div className="grid gap-5 sm:grid-cols-2">
            <ModalField icon={<Building2 className="h-4 w-4" />} label="Nom de l’agence"><input value={form.nom} onChange={(event) => setForm((current) => ({ ...current, nom: event.target.value }))} required placeholder="Agence Lomé Gare" className={fieldClass} /></ModalField>
            <ModalField icon={<MapPin className="h-4 w-4" />} label="Ville"><select value={form.ville_id} onChange={(event) => setForm((current) => ({ ...current, ville_id: event.target.value }))} required className={fieldClass}><option value="">Sélectionner une ville</option>{cities.filter((city) => city.is_active).map((city) => <option key={city.id} value={city.id}>{city.name} — {city.region}</option>)}</select></ModalField>
            <ModalField icon={<Phone className="h-4 w-4" />} label="Téléphone"><input value={form.telephone} onChange={(event) => setForm((current) => ({ ...current, telephone: event.target.value }))} required placeholder="90 00 00 00" className={fieldClass} /></ModalField>
            <ModalField icon={<UserRound className="h-4 w-4" />} label="Gestionnaire"><select value={form.gestionnaire_id} onChange={(event) => setForm((current) => ({ ...current, gestionnaire_id: event.target.value }))} className={fieldClass}><option value="">Aucun gestionnaire</option>{agents.filter((agent) => agent.actif && (!agent.agence || agent.agence.id === agency?.id)).map((agent) => <option key={agent.id} value={agent.id}>{agent.prenom} {agent.nom}</option>)}</select></ModalField>
            <label className="sm:col-span-2"><span className="mb-2 block text-sm font-semibold text-slate-700">Adresse complète</span><textarea value={form.adresse} onChange={(event) => setForm((current) => ({ ...current, adresse: event.target.value }))} required rows={3} placeholder="Quartier, rue, repère…" className={fieldClass} /></label>
          </div>
          <div className="flex justify-end gap-3 border-t border-slate-100 pt-5"><button type="button" onClick={onClose} className="rounded-2xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Annuler</button><button type="submit" disabled={saving} className="rounded-2xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{saving ? 'Enregistrement…' : agency ? 'Enregistrer' : "Créer l'agence"}</button></div>
        </form>
      </div>
    </div>
  );
};

const ModalField: React.FC<{ icon: React.ReactNode; label: string; children: React.ReactNode }> = ({ icon, label, children }) => (
  <label><span className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">{icon}{label}</span>{children}</label>
);

export default AgencyModal;
