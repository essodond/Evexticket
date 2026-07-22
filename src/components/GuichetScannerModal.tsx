import React, { useState } from 'react';
import apiService from '../services/api';

interface Props { open: boolean; onClose: () => void; onResult?: (data:any)=>void }

const GuichetScannerModal: React.FC<Props> = ({ open, onClose, onResult }) => {
  const [raw, setRaw] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError(null);
    try {
      // If user pasted raw JSON or base64 payload, we send as-is
      const payload = { qr_code_data: raw };
      const resp = await apiService.scannerQrGuichet(payload);
      setResult(resp);
      onResult?.(resp);
    } catch (err: any) {
      setError(err?.message || 'Erreur');
    } finally { setLoading(false); }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl w-full max-w-md p-6">
        <h3 className="text-lg font-semibold mb-4">Scanner QR</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-sm">Données QR (coller le JSON)</label>
            <textarea rows={6} className="w-full border rounded px-3 py-2" value={raw} onChange={e=>setRaw(e.target.value)} />
          </div>
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <div className="flex items-center justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded">Fermer</button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded">{loading? '...' : 'Valider'}</button>
          </div>
          {result && (
            <div className="mt-4 border rounded p-3 bg-gray-50">
              <div className="font-semibold">Résultat: {result.resultat}</div>
              <div className="text-sm text-gray-700">{result.message}</div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default GuichetScannerModal;
