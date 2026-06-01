import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import type { MatchRecord, PredictionRecord } from '../lib/types';

const statusLabel: Record<MatchRecord['status'], string> = {
  pendente: 'Pendente',
  ao_vivo: 'Ao vivo',
  finalizado: 'Finalizado',
  aguardando_resultado: 'Aguardando resultado',
  agendado: 'Pendente',
};

export default function Matches() {
  const { user } = useAuth();
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [predictions, setPredictions] = useState<Record<number, PredictionRecord>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('todos');

  const fetchMatchesAndPredictions = useCallback(async () => {
    setLoading(true);

    try {
      const { data: matchesData, error: matchesError } = await supabase
        .from('cravou_matches')
        .select('*')
        .order('data_hora', { ascending: true });

      if (matchesError) {
        throw matchesError;
      }

      setMatches((matchesData as MatchRecord[]) ?? []);

      if (!user) {
        setPredictions({});
        return;
      }

      const { data: predictionData, error: predictionError } = await supabase
        .from('cravou_predictions')
        .select('match_id, palpite_a, palpite_b')
        .eq('user_id', user.id);

      if (predictionError) {
        throw predictionError;
      }

      const nextPredictions: Record<number, PredictionRecord> = {};
      (predictionData as PredictionRecord[] | null)?.forEach((prediction) => {
        nextPredictions[prediction.match_id] = prediction;
      });
      setPredictions(nextPredictions);
    } catch (error) {
      console.error('Falha ao carregar jogos e palpites.', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void fetchMatchesAndPredictions();
  }, [fetchMatchesAndPredictions]);

  const filteredMatches = useMemo(
    () =>
      matches.filter((match) => {
        if (activeTab === 'todos') {
          return true;
        }

        return match.fase === activeTab;
      }),
    [activeTab, matches],
  );

  return (
    <div className="min-h-screen bg-background px-4 pb-28 pt-6 text-white md:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-bento-lg border border-white/10 bg-white/5 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-secondary">Jogos e palpites</p>
            <h1 className="mt-3 text-3xl font-black uppercase tracking-[0.08em] text-white">Painel de confrontos</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-300">
              A estrutura ja aceita os status {Object.keys(statusLabel).join(', ')} para integrar a API oficial de resultados nas proximas sprints.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-bento border border-white/10 bg-white/5 p-5">
              <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Jogos listados</p>
              <p className="mt-4 text-4xl font-black text-primary">{matches.length}</p>
            </div>
            <div className="rounded-bento border border-white/10 bg-white/5 p-5">
              <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Palpites salvos</p>
              <p className="mt-4 text-4xl font-black text-secondary">{Object.keys(predictions).length}</p>
            </div>
          </div>
        </header>

        <div className="inline-flex flex-wrap gap-2 rounded-pill border border-white/10 bg-white/5 p-2 backdrop-blur-xl">
          {['todos', 'Fase de Grupos', 'Mata-Mata'].map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                className={[
                  'rounded-pill px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] transition',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70',
                  isActive ? 'bg-primary text-black shadow-glow-primary' : 'text-zinc-300 hover:bg-white/10 hover:text-white',
                ].join(' ')}
                key={tab}
                onClick={() => setActiveTab(tab)}
                type="button"
              >
                {tab === 'todos' ? 'Todos' : tab}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="rounded-bento-lg border border-white/10 bg-white/5 p-10 text-center text-sm text-zinc-300 backdrop-blur-xl">
            Carregando confrontos...
          </div>
        ) : filteredMatches.length === 0 ? (
          <div className="rounded-bento-lg border border-dashed border-white/15 bg-white/5 p-10 text-center text-sm text-zinc-400 backdrop-blur-xl">
            Nenhum jogo encontrado para este filtro.
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {filteredMatches.map((match) => {
              const prediction = predictions[match.id];
              const locked = new Date() >= new Date(match.data_hora);

              return (
                <article
                  className="rounded-bento-lg border border-white/10 bg-white/5 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl"
                  key={match.id}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-500">{match.fase}</p>
                      <h2 className="mt-2 text-lg font-bold text-white">
                        {match.time_a} x {match.time_b}
                      </h2>
                    </div>
                    <span
                      className={`rounded-pill px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] ${
                        match.status === 'ao_vivo'
                          ? 'bg-secondary/15 text-secondary'
                          : match.status === 'finalizado'
                            ? 'bg-primary/10 text-primary'
                            : 'bg-white/10 text-zinc-300'
                      }`}
                    >
                      {statusLabel[match.status] ?? match.status}
                    </span>
                  </div>

                  <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                    <div className="text-center">
                      <div className="text-3xl">{match.flag_a ?? 'A'}</div>
                      <p className="mt-2 text-sm font-semibold text-zinc-200">{match.time_a}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-center">
                      <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Seu palpite</p>
                      <p className="mt-2 text-2xl font-black text-white">
                        {prediction ? `${prediction.palpite_a} x ${prediction.palpite_b}` : '--'}
                      </p>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl">{match.flag_b ?? 'B'}</div>
                      <p className="mt-2 text-sm font-semibold text-zinc-200">{match.time_b}</p>
                    </div>
                  </div>

                  <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4 text-xs uppercase tracking-[0.2em] text-zinc-400">
                    <span>{new Date(match.data_hora).toLocaleString('pt-BR')}</span>
                    <span>{locked ? 'Travado' : 'Aberto para palpite'}</span>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
