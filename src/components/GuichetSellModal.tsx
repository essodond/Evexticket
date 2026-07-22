import React, { useEffect, useState } from 'react';
import apiService from '../services/api';

interface Props { open: boolean; onClose: () => void; onCreated?: (data: any) => void }

const GuichetSellModal: React.FC<Props> = ({ open, onClose, onCreated }) => {
  const [voyages, setVoyages] = useState<any[]>([]);
  const [voyageId, setVoyageId] = useState<string | null>(null);
  const [siege, setSiege] = useState<string>('1');
  const [clientNom, setClientNom] = useState('');
  const [clientTel, setClientTel] = useState('');
  const [mode, setMode] = useState<'cash'|'flooz'|'tmoney'>('cash');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let mounted = true;
    (async () => {
      try {
        const v = await apiService.getGuichetVoyagesDisponibles();
        if (!mounted) return;
        setVoyages(v || []);
        if (v && v.length) setVoyageId(String(v[0].id));
      } catch (e) { console.error(e); }
    })();
    return () => { mounted = false };
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setLoading(true);
    try {
      const payload = { voyage_id: voyageId || '', numero_siege: Number(siege), client_nom: clientNom, client_telephone: clientTel, mode_paiement: mode };
      const resp = await apiService.creerVenteGuichet(payload);
      onCreated?.(resp);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Erreur');
    } finally { setLoading(false); }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl w-full max-w-md p-6">
        <h3 className="text-lg font-semibold mb-4">Vendre un billet</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-sm">Voyage</label>
            <select className="w-full border rounded px-3 py-2" value={voyageId || ''} onChange={e => setVoyageId(e.target.value)}>
              {voyages.map(v => <option key={v.id} value={v.id}>{v.trajet || v.trip?.departure_city_display + ' → ' + v.trip?.arrival_city_display} — {v.date}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-sm">Siège</label>
              <input className="w-full border rounded px-3 py-2" value={siege} onChange={e=>setSiege(e.target.value)} />
            </div>
            <div>
              <label className="text-sm">Mode paiement</label>
              <select className="w-full border rounded px-3 py-2" value={mode} onChange={e=>setMode(e.target.value as any)}>
                <option value="cash">Cash</option>
                <option value="flooz">Flooz</option>
                <option value="tmoney">T-Money</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm">Nom client</label>
            <input className="w-full border rounded px-3 py-2" value={clientNom} onChange={e=>setClientNom(e.target.value)} />
          </div>
          <div>
            <label className="text-sm">Téléphone</label>
            <input className="w-full border rounded px-3 py-2" value={clientTel} onChange={e=>setClientTel(e.target.value)} />
          </div>
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <div className="flex items-center justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded">Annuler</button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded">{loading? '...' : 'Vendre'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GuichetSellModal;
