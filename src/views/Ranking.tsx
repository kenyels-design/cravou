import { useCallback, useEffect, useState } from 'react';
import { FeedbackBanner } from '../components/ui/FeedbackBanner';
import { useAuth } from '../context/AuthContext';
import { getLeaderboard } from '../lib/matches';
import type { Sprint3LeaderboardEntry } from '../lib/types';

export default function Ranking() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<Sprint3LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadRanking = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const rows = await getLeaderboard();
      setEntries(rows);
    } catch (error) {
      const message =
        error && typeof error === 'object' && 'message' in error
          ? String(error.message)
          : 'Nao foi possivel carregar o ranking agora.';
      setErrorMessage(message);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRanking();
  }, [loadRanking]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(204,255,0,0.10),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(255,0,127,0.12),_transparent_24%),linear-gradient(180deg,_rgba(16,18,38,0.95),_rgba(7,10,24,1))] px-4 pb-28 pt-6 text-white md:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-bento-lg border border-white/10 bg-white/5 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-secondary">Ranking</p>
          <h1 className="mt-3 text-3xl font-black uppercase tracking-[0.08em] text-white">
            Classificacao geral
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-300">
            Veja quem esta somando mais pontos na disputa interna da Camerite.
          </p>
        </header>

        {errorMessage ? <FeedbackBanner message={errorMessage} tone="error" /> : null}

        {loading ? (
          <div className="rounded-bento-lg border border-white/10 bg-white/5 p-10 text-center text-sm text-zinc-300 backdrop-blur-xl">
            Carregando ranking...
          </div>
        ) : entries.length === 0 ? (
          <div className="rounded-bento-lg border border-dashed border-white/15 bg-white/5 p-10 text-center text-sm leading-6 text-zinc-300 backdrop-blur-xl">
            Ainda nao ha pontuacao consolidada para exibir.
          </div>
        ) : (
          <section className="overflow-hidden rounded-bento-lg border border-white/10 bg-white/5 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl">
            <div className="grid grid-cols-[72px_1.2fr_1fr_120px] gap-4 border-b border-white/10 px-5 py-4 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
              <span>Pos.</span>
              <span>Nome</span>
              <span>Departamento</span>
              <span className="text-right">Pontos</span>
            </div>

            {entries.map((entry, index) => {
              const isCurrentUser = user?.id === entry.user_id;

              return (
                <div
                  className={`grid grid-cols-[72px_1.2fr_1fr_120px] gap-4 border-b border-white/10 px-5 py-4 text-sm last:border-b-0 ${
                    isCurrentUser ? 'bg-primary/10' : ''
                  }`}
                  key={entry.user_id}
                >
                  <span className="font-black text-white">{index + 1}</span>
                  <span className={`font-semibold ${isCurrentUser ? 'text-primary' : 'text-white'}`}>{entry.nome}</span>
                  <span className="text-zinc-300">{entry.departamento ?? 'Nao informado'}</span>
                  <span className="text-right font-black text-white">{entry.total_points}</span>
                </div>
              );
            })}
          </section>
        )}
      </div>
    </div>
  );
}
