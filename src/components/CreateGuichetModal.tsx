import React, { useState } from 'react';
import apiService from '../services/api';

interface Props { open: boolean; onClose: () => void; onCreated?: (agent:any)=>void }

const CreateGuichetModal: React.FC<Props> = ({ open, onClose, onCreated }) => {
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [telephone, setTelephone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError(null);
    try {
      const payload = { nom, prenom, telephone, email, password };
      const resp = await apiService.createGuichetAgent(payload);
      setNom('');
      setPrenom('');
      setTelephone('');
      setEmail('');
      setPassword('');
      onCreated?.(resp);
      onClose();
    } catch (err:any) {
      setError(err?.message || 'Erreur');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl w-full max-w-md p-6">
        <h3 className="text-lg font-semibold mb-4">Créer un gestionnaire de guichet</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-sm">Nom</label>
            <input className="w-full border rounded px-3 py-2" value={nom} onChange={e=>setNom(e.target.value)} required />
          </div>
          <div>
            <label className="text-sm">Prénom</label>
            <input className="w-full border rounded px-3 py-2" value={prenom} onChange={e=>setPrenom(e.target.value)} required />
          </div>
          <div>
            <label className="text-sm">Téléphone</label>
            <input className="w-full border rounded px-3 py-2" value={telephone} onChange={e=>setTelephone(e.target.value)} required />
          </div>
          <div>
            <label className="text-sm">Email</label>
            <input className="w-full border rounded px-3 py-2" type="email" value={email} onChange={e=>setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="text-sm">Mot de passe</label>
            <input className="w-full border rounded px-3 py-2" type="password" value={password} onChange={e=>setPassword(e.target.value)} minLength={8} autoComplete="new-password" required />
            <p className="mt-1 text-xs text-slate-500">8 caractères minimum, sans mot de passe trop courant.</p>
          </div>
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <div className="flex items-center justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded">Annuler</button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded">{loading? '...' : 'Créer'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateGuichetModal;
