import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { MatchRecord } from '../lib/types';

export default function Admin() {
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [scores, setScores] = useState<Record<number, { gols_a: string; gols_b: string }>>({});
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const fetchMatches = useCallback(async () => {
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('cravou_matches')
        .select('*')
        .order('data_hora', { ascending: true });

      if (error) {
        throw error;
      }

      const nextMatches = (data as MatchRecord[]) ?? [];
      setMatches(nextMatches);
      setScores(
        nextMatches.reduce<Record<number, { gols_a: string; gols_b: string }>>((accumulator, match) => {
          accumulator[match.id] = {
            gols_a: match.gols_a != null ? String(match.gols_a) : '',
            gols_b: match.gols_b != null ? String(match.gols_b) : '',
          };
          return accumulator;
        }, {}),
      );
    } catch (error) {
      console.error('Falha ao carregar painel admin.', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchMatches();
  }, [fetchMatches]);

  const handleScoreChange = (matchId: number, team: 'a' | 'b', value: string) => {
    if (value !== '' && !/^\d+$/.test(value)) {
      return;
    }

    setScores((current) => ({
      ...current,
      [matchId]: {
        ...current[matchId],
        [`gols_${team}`]: value,
      },
    }));
  };

  const handleFinalizeMatch = async (matchId: number) => {
    const currentScore = scores[matchId];

    if (!currentScore?.gols_a || !currentScore?.gols_b) {
      return;
    }

    setUpdatingId(matchId);

    try {
      const { error } = await supabase
        .from('cravou_matches')
        .update({
          gols_a: Number.parseInt(currentScore.gols_a, 10),
          gols_b: Number.parseInt(currentScore.gols_b, 10),
          status: 'finalizado',
        })
        .eq('id', matchId);

      if (error) {
        throw error;
      }

      await fetchMatches();
    } catch (error) {
      console.error('Falha ao finalizar partida.', error);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 pb-28 pt-6 text-white md:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="rounded-bento-lg border border-secondary/20 bg-secondary/10 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-secondary">Admin</p>
          <h1 className="mt-3 text-3xl font-black uppercase tracking-[0.08em] text-white">Fechamento de partidas</h1>
        </header>

        {loading ? (
          <div className="rounded-bento-lg border border-white/10 bg-white/5 p-10 text-center text-sm text-zinc-300 backdrop-blur-xl">
            Carregando jogos...
          </div>
        ) : (
          <div className="space-y-4">
            {matches.map((match) => {
              const isFinalized = match.status === 'finalizado';

              return (
                <article
                  className="rounded-bento-lg border border-white/10 bg-white/5 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl"
                  key={match.id}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">
                        #{match.id} {match.fase}
                      </p>
                      <h2 className="mt-2 text-lg font-bold text-white">
                        {match.time_a} x {match.time_b}
                      </h2>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <label className="sr-only" htmlFor={`gols-a-${match.id}`}>
                        Gols do time A
                      </label>
                      <input
                        className="h-11 w-16 rounded-2xl border border-white/10 bg-black/25 text-center text-lg font-black text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/70 disabled:opacity-50"
                        disabled={isFinalized}
                        id={`gols-a-${match.id}`}
                        inputMode="numeric"
                        maxLength={2}
                        onChange={(event) => handleScoreChange(match.id, 'a', event.target.value)}
                        value={scores[match.id]?.gols_a ?? ''}
                      />
                      <span className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-400">x</span>
                      <label className="sr-only" htmlFor={`gols-b-${match.id}`}>
                        Gols do time B
                      </label>
                      <input
                        className="h-11 w-16 rounded-2xl border border-white/10 bg-black/25 text-center text-lg font-black text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/70 disabled:opacity-50"
                        disabled={isFinalized}
                        id={`gols-b-${match.id}`}
                        inputMode="numeric"
                        maxLength={2}
                        onChange={(event) => handleScoreChange(match.id, 'b', event.target.value)}
                        value={scores[match.id]?.gols_b ?? ''}
                      />
                      <button
                        className="inline-flex min-h-11 items-center justify-center rounded-pill bg-secondary px-5 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-secondary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/70 disabled:cursor-not-allowed disabled:opacity-55"
                        disabled={isFinalized || updatingId === match.id || !scores[match.id]?.gols_a || !scores[match.id]?.gols_b}
                        onClick={() => void handleFinalizeMatch(match.id)}
                        type="button"
                      >
                        {updatingId === match.id ? 'Salvando...' : isFinalized ? 'Finalizado' : 'Finalizar'}
                      </button>
                    </div>
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
