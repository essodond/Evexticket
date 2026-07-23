import React, { useMemo, useState } from 'react';
import { Loader2, Mic, MicOff, Search, Sparkles, Volume2 } from 'lucide-react';

import apiService, { AIVoiceCommandResponse } from '../../services/api';
import GuichetPageShell from './GuichetPageShell';

const GuichetVoiceAssistantPage: React.FC = () => {
  const [transcript, setTranscript] = useState('');
  const [listening, setListening] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AIVoiceCommandResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recognitionSupported = useMemo(
    () => typeof window !== 'undefined' && Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition),
    []
  );

  const startListening = () => {
    const Recognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!Recognition) {
      setError('La reconnaissance vocale n’est pas disponible dans ce navigateur. Vous pouvez dicter avec le clavier ou écrire la demande.');
      return;
    }
    const recognition = new Recognition();
    recognition.lang = 'fr-FR';
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.onstart = () => { setListening(true); setError(null); };
    recognition.onresult = (event: any) => {
      const value = Array.from(event.results)
        .map((item: any) => item[0]?.transcript || '')
        .join(' ');
      setTranscript(value);
    };
    recognition.onerror = () => { setListening(false); setError('La dictée a été interrompue. Réessayez ou écrivez la demande.'); };
    recognition.onend = () => setListening(false);
    recognition.start();
  };

  const interpret = async () => {
    if (!transcript.trim()) return;
    setLoading(true);
    setError(null);
    try {
      setResult(await apiService.interpretGuichetVoiceCommand(transcript.trim()));
    } catch (interpretError: any) {
      setError(interpretError?.message || 'Impossible d’interpréter cette demande.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <GuichetPageShell
      eyebrow="Assistant vocal"
      title="Trouver un voyage à la voix"
      description="Dites par exemple : « Deux places de Kara vers Lomé demain matin ». L’assistant prépare la recherche, l’agent garde toujours la validation finale."
    >
      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white">
            <Volume2 className="h-6 w-6" />
          </div>
          <label className="mt-6 block">
            <span className="mb-2 block text-sm font-bold text-slate-700">Demande du client</span>
            <textarea
              rows={6}
              value={transcript}
              onChange={(event) => setTranscript(event.target.value)}
              placeholder="Ex. Une place de Sokodé vers Lomé samedi après-midi…"
              className="w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />
          </label>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <button type="button" onClick={startListening} disabled={listening} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700 disabled:opacity-50">
              {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              {listening ? 'J’écoute…' : 'Dicter'}
            </button>
            <button type="button" onClick={() => void interpret()} disabled={loading || !transcript.trim()} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Chercher
            </button>
          </div>
          {!recognitionSupported && <p className="mt-3 text-xs text-amber-700">La dictée native n’est pas disponible ici, mais la saisie écrite reste opérationnelle.</p>}
          {error && <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div><h2 className="text-lg font-bold text-slate-950">Résultats interprétés</h2><p className="text-sm text-slate-500">{result ? `${result.trips.length} voyage(s) trouvé(s)` : 'En attente d’une demande'}</p></div>
            <Sparkles className="h-6 w-6 text-blue-600" />
          </div>
          <div className="mt-5 space-y-3">
            {result?.trips.map((trip) => (
              <article key={trip.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div><p className="text-xs font-bold uppercase tracking-wide text-blue-600">{trip.trip_info.company_name}</p><h3 className="mt-1 font-bold text-slate-950">{trip.trip_info.departure_city_name} → {trip.trip_info.arrival_city_name}</h3><p className="mt-2 text-sm text-slate-500">{trip.date} · {trip.trip_info.departure_time?.slice(0, 5)} · {trip.available_seats} place(s)</p></div>
                  <p className="whitespace-nowrap font-extrabold text-slate-900">{Number(trip.trip_info.price || 0).toLocaleString('fr-FR')} F</p>
                </div>
              </article>
            ))}
            {result && result.trips.length === 0 && <div className="rounded-2xl bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">Aucun voyage correspondant. Reformulez la date ou les villes.</div>}
            {!result && <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-16 text-center text-sm text-slate-500">La recherche vocale apparaîtra ici.</div>}
          </div>
          {result && <p className="mt-4 text-[11px] text-slate-400">{result.provider === 'openai' ? 'Compréhension IA active' : 'Moteur EVEX hors ligne'}</p>}
        </section>
      </div>
    </GuichetPageShell>
  );
};

export default GuichetVoiceAssistantPage;
