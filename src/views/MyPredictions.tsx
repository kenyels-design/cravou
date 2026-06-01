import { useCallback, useEffect, useMemo, useState } from 'react';
import { FeedbackBanner } from '../components/ui/FeedbackBanner';
import { getMyPredictions } from '../lib/matches';
import type { Sprint3PredictionWithMatchRecord } from '../lib/matches';

function statusBadge(prediction: Sprint3PredictionWithMatchRecord) {
  if (prediction.matches.status === 'ao_vivo') {
    return 'bg-secondary/10 text-secondary border-secondary/30';
  }

  if (prediction.matches.status === 'pendente') {
    return 'bg-white/10 text-zinc-300 border-white/10';
  }

  if ((prediction.points ?? 0) > 0) {
    return 'bg-primary/10 text-primary border-primary/30';
  }

  return 'bg-rose-500/10 text-rose-200 border-rose-400/30';
}

function statusLabel(prediction: Sprint3PredictionWithMatchRecord) {
  if (prediction.matches.status === 'ao_vivo') {
    return 'Ao Vivo';
  }

  if (prediction.matches.status === 'pendente') {
    return 'Pendente';
  }

  return (prediction.points ?? 0) > 0 ? 'Acertou' : 'Errou';
}

export default function MyPredictions() {
  const [predictions, setPredictions] = useState<Sprint3PredictionWithMatchRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadPredictions = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const rows = await getMyPredictions();
      setPredictions(rows);
    } catch (error) {
      const message =
        error && typeof error === 'object' && 'message' in error
          ? String(error.message)
          : 'Nao foi possivel carregar seus palpites agora.';
      setErrorMessage(message);
      setPredictions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPredictions();
  }, [loadPredictions]);

  const stats = useMemo(() => {
    const totalPredictions = predictions.length;
    const exactScores = predictions.filter((prediction) => prediction.points === 10).length;
    const correctOutcomes = predictions.filter((prediction) => (prediction.points ?? 0) >= 5).length;
    const totalPoints = predictions.reduce((sum, prediction) => sum + (prediction.points ?? 0), 0);

    return {
      totalPredictions,
      exactScores,
      correctOutcomes,
      totalPoints,
    };
  }, [predictions]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(204,255,0,0.10),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(255,0,127,0.12),_transparent_24%),linear-gradient(180deg,_rgba(16,18,38,0.95),_rgba(7,10,24,1))] px-4 pb-28 pt-6 text-white md:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-bento-lg border border-white/10 bg-white/5 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-secondary">Meus Palpites</p>
          <h1 className="mt-3 text-3xl font-black uppercase tracking-[0.08em] text-white">
            Seu desempenho jogo a jogo
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-300">
            Acompanhe seus palpites, compare com os placares reais e veja sua pontuacao acumulada.
          </p>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-bento-lg border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
            <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">Total de palpites</p>
            <p className="mt-4 text-4xl font-black text-white">{stats.totalPredictions}</p>
          </article>
          <article className="rounded-bento-lg border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
            <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">Placares exatos</p>
            <p className="mt-4 text-4xl font-black text-primary">{stats.exactScores}</p>
          </article>
          <article className="rounded-bento-lg border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
            <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">Desfechos certos</p>
            <p className="mt-4 text-4xl font-black text-secondary">{stats.correctOutcomes}</p>
          </article>
          <article className="rounded-bento-lg border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
            <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">Pontuacao total</p>
            <p className="mt-4 text-4xl font-black text-primary">{stats.totalPoints}</p>
          </article>
        </section>

        {errorMessage ? <FeedbackBanner message={errorMessage} tone="error" /> : null}

        {loading ? (
          <div className="rounded-bento-lg border border-white/10 bg-white/5 p-10 text-center text-sm text-zinc-300 backdrop-blur-xl">
            Carregando seus palpites...
          </div>
        ) : predictions.length === 0 ? (
          <div className="rounded-bento-lg border border-dashed border-white/15 bg-white/5 p-10 text-center text-sm leading-6 text-zinc-300 backdrop-blur-xl">
            Voce ainda nao registrou palpites. Acesse a tela Jogos para começar.
          </div>
        ) : (
          <div className="space-y-4">
            {predictions.map((prediction) => (
              <article
                className="rounded-bento-lg border border-white/10 bg-white/5 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl"
                key={prediction.id}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">
                      {prediction.matches.round} · {new Date(prediction.matches.match_time).toLocaleString('pt-BR')}
                    </p>
                    <h2 className="mt-2 text-lg font-bold text-white">
                      {prediction.matches.home_team} x {prediction.matches.away_team}
                    </h2>
                  </div>

                  <span
                    className={`rounded-pill border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] ${statusBadge(prediction)}`}
                  >
                    {statusLabel(prediction)}
                  </span>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  <div className="rounded-bento border border-white/10 bg-black/20 p-4 text-center">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Times</p>
                    <p className="mt-2 text-base font-semibold text-white">
                      {prediction.matches.home_team} x {prediction.matches.away_team}
                    </p>
                  </div>
                  <div className="rounded-bento border border-white/10 bg-black/20 p-4 text-center">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Placar real</p>
                    <p className="mt-2 text-2xl font-black text-white">
                      {prediction.matches.home_score != null && prediction.matches.away_score != null
                        ? `${prediction.matches.home_score} x ${prediction.matches.away_score}`
                        : '--'}
                    </p>
                  </div>
                  <div className="rounded-bento border border-white/10 bg-black/20 p-4 text-center">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Meu palpite</p>
                    <p className="mt-2 text-2xl font-black text-primary">
                      {prediction.home_score} x {prediction.away_score}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex justify-end">
                  <span className="rounded-pill bg-primary px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-black">
                    {prediction.points ?? 0} pts
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
