import React, { useEffect, useState } from 'react';
import apiService from '../services/api';
import StatCard from './widgets/StatCard';
import { Bus, LogOut, QrCode } from 'lucide-react';
import GuichetSellModal from './GuichetSellModal';
import GuichetScannerModal from './GuichetScannerModal';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const GuichetDashboard: React.FC = () => {
  const auth = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [voyages, setVoyages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sellOpen, setSellOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);

  const handleLogout = () => {
    auth.logout();
    navigate('/guichet/login', { replace: true });
  };

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const d = await apiService.getGuichetDashboard();
        const v = await apiService.getGuichetVoyagesDisponibles();
        if (!mounted) return;
        setStats(d || {});
        setVoyages(v || []);
      } catch (e) {
        console.error('Impossible de charger le dashboard guichet', e);
      } finally { if (mounted) setLoading(false); }
    };
    load();
    return () => { mounted = false; };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Bonjour, {stats?.agent?.prenom || auth.user?.first_name || 'Gestionnaire'} 👋</h1>
            <div className="text-sm text-gray-500">Guichet {stats?.agent?.compagnie || ''} • Session active</div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setScanOpen(true)} className="px-4 py-2 bg-white border rounded-lg shadow-sm flex items-center gap-2"><QrCode className="w-5 h-5"/> Scanner QR</button>
            <button onClick={() => setSellOpen(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow-sm flex items-center gap-2"><Bus className="w-5 h-5"/> Vendre un billet</button>
            <button onClick={handleLogout} className="px-4 py-2 bg-white border rounded-lg shadow-sm flex items-center gap-2 text-red-600"><LogOut className="w-5 h-5"/> Déconnexion</button>
            <GuichetSellModal open={sellOpen} onClose={() => setSellOpen(false)} onCreated={(d)=>{ console.log('vente created', d); }} />
            <GuichetScannerModal open={scanOpen} onClose={() => setScanOpen(false)} onResult={(r)=>{ console.log('scan result', r); }} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <StatCard title="Billets vendus aujourd'hui" value={stats?.billets_vendus ?? 0} color="#2563EB" />
          <StatCard title="Chiffre d'affaires (FCFA)" value={(stats?.montant_collecte ?? 0).toLocaleString?.('fr-FR') ? `${Number(stats?.montant_collecte||0).toLocaleString('fr-FR')} FCFA` : `${stats?.montant_collecte ?? 0} FCFA`} color="#10B981" />
          <StatCard title="Départs imminents" value={stats?.voyages_actifs ?? 0} color="#F59E0B" />
        </div>

        <div className="bg-white rounded-2xl shadow-sm border p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Voyages du jour</h2>
            <a className="text-sm text-blue-600">Voir tout l'horaire</a>
          </div>
          <div className="space-y-3">
            {loading && <div className="p-6 text-center text-gray-400">Chargement...</div>}
            {!loading && voyages.length === 0 && <div className="p-6 text-gray-500">Aucun voyage pour aujourd'hui</div>}
            {voyages.map((v:any) => (
              <div key={v.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600"><Bus/></div>
                  <div>
                    <div className="font-semibold">{v.trajet || v.trip?.departure_city_display + ' → ' + v.trip?.arrival_city_display}</div>
                    <div className="text-sm text-gray-500">{v.trip?.departure_time || v.heure_depart} • {v.trip?.company_name || v.compagnie}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">{v.places_libres ?? v.available_seats ?? v.trip?.available_seats}/{v.places_total ?? v.trip?.capacity}</div>
                  <div className="text-xs text-gray-400">{v.statut ?? (v.is_active ? 'Embarquement' : 'Terminé')}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default GuichetDashboard;
