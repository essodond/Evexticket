import React, { useEffect, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import apiService from '../../services/api';
import type { AgencyCounter } from '../../services/api';

interface CounterModalProps {
  open: boolean;
  agencyId: string;
  counter?: AgencyCounter | null;
  onClose: () => void;
  onSaved: (counter: AgencyCounter) => void;
}

const CounterModal: React.FC<CounterModalProps> = ({
  open,
  agencyId,
  counter = null,
  onClose,
  onSaved,
}) => {
  const [code, setCode] = useState('');
  const [nom, setNom] = useState('');
  const [emplacement, setEmplacement] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setCode(counter?.code || '');
    setNom(counter?.nom || '');
    setEmplacement(counter?.emplacement || '');
    setError(null);
  }, [counter, open]);

  if (!open) return null;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        code: code.trim().toUpperCase(),
        nom: nom.trim(),
        emplacement: emplacement.trim(),
      };
      const saved = counter
        ? await apiService.updateAgencyCounter(agencyId, counter.id, payload)
        : await apiService.createAgencyCounter(agencyId, payload);
      onSaved(saved);
    } catch (saveError: any) {
      setError(saveError?.message || "Impossible d'enregistrer ce guichet.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">Point de vente</p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">{counter ? 'Modifier le guichet' : 'Nouveau guichet'}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Fermer">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Code du guichet</span>
            <input value={code} onChange={(event) => setCode(event.target.value)} maxLength={30} placeholder="G01" required className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm uppercase outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Nom</span>
            <input value={nom} onChange={(event) => setNom(event.target.value)} maxLength={150} placeholder="Guichet principal" required className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Emplacement dans l'agence</span>
            <input value={emplacement} onChange={(event) => setEmplacement(event.target.value)} maxLength={200} placeholder="Hall d'entrée, comptoir de gauche…" className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
          </label>

          {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} disabled={saving} className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Annuler</button>
            <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CounterModal;
