import { useCallback, useEffect, useMemo, useState } from 'react';
import { FeedbackBanner } from '../components/ui/FeedbackBanner';
import { getMyPredictions } from '../lib/matches';
import type { Sprint3PredictionWithMatchRecord } from '../lib/matches';

type PredictionFilter = 'todos' | 'acertos' | 'erros' | 'ao_vivo' | 'pendente';

const filterLabels: Record<PredictionFilter, string> = {
  todos: 'Todos',
  acertos: 'Acertos',
  erros: 'Erros',
  ao_vivo: 'Ao Vivo',
  pendente: 'Pendentes',
};

function predictionStatus(prediction: Sprint3PredictionWithMatchRecord) {
  if (prediction.matches.status === 'ao_vivo') {
    return 'ao_vivo';
  }

  if (prediction.matches.status === 'pendente') {
    return 'pendente';
  }

  return (prediction.points ?? 0) > 0 ? 'acerto' : 'erro';
}

function matchesFilter(prediction: Sprint3PredictionWithMatchRecord, filter: PredictionFilter) {
  if (filter === 'todos') {
    return true;
  }

  const status = predictionStatus(prediction);

  if (filter === 'acertos') {
    return status === 'acerto';
  }

  if (filter === 'erros') {
    return status === 'erro';
  }

  return status === filter;
}

function cardClass(prediction: Sprint3PredictionWithMatchRecord) {
  const status = predictionStatus(prediction);

  if (status === 'acerto') {
    return 'bg-[#0D1F0D] border border-[#1A3A1A]';
  }

  if (status === 'erro') {
    return 'bg-[#1A0D0D] border border-[#2A1A1A]';
  }

  return 'bg-[#141414] border border-[#2A2A2A]';
}

export default function MyPredictions() {
  const [predictions, setPredictions] = useState<Sprint3PredictionWithMatchRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<PredictionFilter>('todos');

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

  const filteredPredictions = useMemo(
    () => predictions.filter((prediction) => matchesFilter(prediction, activeFilter)),
    [activeFilter, predictions],
  );

  const stats = useMemo(() => {
    const hits = predictions.filter((prediction) => predictionStatus(prediction) === 'acerto').length;
    const misses = predictions.filter((prediction) => predictionStatus(prediction) === 'erro').length;

    return { hits, misses };
  }, [predictions]);

  return (
    <div className="min-h-screen bg-[#0A0A0A] px-4 pb-28 pt-6 text-white md:px-8 md:pb-12">
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="rounded-[16px] border border-[#2A2A2A] bg-[#141414] p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-[#CCFF00]">Historico</p>
              <h2 className="mt-2 text-2xl font-bold text-white">Meus Palpites</h2>
            </div>

            <div className="text-sm font-semibold">
              <span className="text-[#CCFF00]">Acertos {stats.hits}</span>
              <span className="ml-2 text-[#FF007F]">Erros {stats.misses}</span>
            </div>
          </div>
        </header>

        <div className="flex flex-wrap gap-2">
          {(Object.keys(filterLabels) as PredictionFilter[]).map((filter) => {
            const isActive = activeFilter === filter;

            return (
              <button
                className={[
                  'rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wide transition',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CCFF00]',
                  isActive
                    ? 'bg-[#CCFF00] text-black'
                    : 'border border-[#2A2A2A] bg-transparent text-gray-400 hover:text-white',
                ].join(' ')}
                key={filter}
                onClick={() => setActiveFilter(filter)}
                type="button"
              >
                {filterLabels[filter]}
              </button>
            );
          })}
        </div>

        {errorMessage ? <FeedbackBanner message={errorMessage} tone="error" /> : null}

        {loading ? (
          <div className="rounded-[16px] border border-[#2A2A2A] bg-[#141414] p-10 text-center text-sm text-gray-300">
            Carregando seus palpites...
          </div>
        ) : filteredPredictions.length === 0 ? (
          <div className="rounded-[16px] border border-dashed border-[#2A2A2A] bg-[#141414] p-10 text-center text-sm text-gray-400">
            Nenhum palpite encontrado para este filtro.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {filteredPredictions.map((prediction) => {
              const status = predictionStatus(prediction);
              const isExact = prediction.points === 10;

              return (
                <article className={`relative rounded-[16px] p-5 ${cardClass(prediction)}`} key={prediction.id}>
                  {status === 'acerto' ? (
                    <div className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-green-500 text-sm font-bold text-black">
                      ✓
                    </div>
                  ) : status === 'erro' ? (
                    <div className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-[#FF007F] text-sm font-bold text-black">
                      ✗
                    </div>
                  ) : null}

                  <p className="text-xs uppercase tracking-wide text-gray-500">{prediction.matches.round}</p>
                  <h3 className="mt-2 text-lg font-bold text-white">
                    {prediction.matches.home_team} x {prediction.matches.away_team}
                  </h3>

                  <div className="mt-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-500">Meu palpite</p>
                      <p className="mt-1 text-2xl font-bold text-white">
                        {prediction.home_score} x {prediction.away_score}
                      </p>
                    </div>

                    {status === 'pendente' || status === 'ao_vivo' ? (
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                          status === 'ao_vivo' ? 'bg-[#FF007F] text-white' : 'border border-[#2A2A2A] text-gray-300'
                        }`}
                      >
                        {status === 'ao_vivo' ? 'Ao Vivo' : 'Pendente'}
                      </span>
                    ) : (
                      <span className="rounded-full bg-[#1C1C1C] px-3 py-1 text-xs font-bold text-white">
                        {prediction.points ?? 0} pts
                      </span>
                    )}
                  </div>

                  {(status === 'acerto' || status === 'erro') && (
                    <p className="mt-3 text-xs text-gray-400">
                      Real: {prediction.matches.home_score ?? '--'} x {prediction.matches.away_score ?? '--'}
                    </p>
                  )}

                  {isExact ? (
                    <span className="mt-4 inline-flex rounded-full bg-[#CCFF00] px-3 py-1 text-xs font-bold uppercase tracking-wide text-black">
                      Cravada!
                    </span>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
