import { useMemo, useState } from 'react';
import { FeedbackBanner } from '../components/ui/FeedbackBanner';
import { useAppData } from '../context/AppDataContext';
import type { Sprint3PredictionWithMatchRecord } from '../lib/matches';

type PredictionFilter = 'todos' | 'acertos' | 'erros' | 'pendente';

type PredictionStatus = 'acerto' | 'erro' | 'pendente' | 'ao_vivo';

const filterLabels: Record<PredictionFilter, string> = {
  todos: 'Todos',
  acertos: 'Acertos',
  erros: 'Erros',
  pendente: 'Pendentes',
};

function predictionStatus(prediction: Sprint3PredictionWithMatchRecord): PredictionStatus {
  if (prediction.matches?.status === 'ao_vivo') {
    return 'ao_vivo';
  }

  if (prediction.points === null || prediction.matches?.status === 'pendente') {
    return 'pendente';
  }

  if (prediction.points === 25) {
    return 'acerto';
  }

  if ([18, 15, 12, 10].includes(prediction.points)) {
    return 'acerto';
  }

  return 'erro';
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
    return 'border border-[#C8E3A6] bg-[#F6FFE0] shadow-[0_2px_8px_rgba(0,0,0,0.08)] dark:bg-[#0D1F0D] dark:border-[#1A3A1A] dark:shadow-none';
  }

  if (status === 'erro') {
    return 'border border-[#F2B6D3] bg-[#FFF1F7] shadow-[0_2px_8px_rgba(0,0,0,0.08)] dark:bg-[#1A0D0D] dark:border-[#2A1A1A] dark:shadow-none';
  }

  return 'border border-[#D0D0D8] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.08)] dark:bg-[#141414] dark:border-[#2A2A2A] dark:shadow-none';
}

export default function MyPredictions() {
  const { predictions, isInitialLoading, errorMessage } = useAppData();
  const [activeFilter, setActiveFilter] = useState<PredictionFilter>('todos');

  const safePredictions = useMemo(
    () =>
      predictions
        .map((prediction) => {
          const match = prediction.matches;

          if (!match) {
            return null;
          }

          return {
            ...prediction,
            matches: match,
          };
        })
        .filter((prediction): prediction is Sprint3PredictionWithMatchRecord => prediction !== null),
    [predictions],
  );

  const filteredPredictions = useMemo(
    () => safePredictions.filter((prediction) => matchesFilter(prediction, activeFilter)),
    [activeFilter, safePredictions],
  );

  const stats = useMemo(() => {
    const hits = safePredictions.filter((prediction) => predictionStatus(prediction) === 'acerto').length;
    const misses = safePredictions.filter((prediction) => predictionStatus(prediction) === 'erro').length;

    return { hits, misses };
  }, [safePredictions]);

  const navigateToMatch = (matchId: string) => {
    window.location.hash = `#match/${matchId}`;
  };

  return (
    <div className="min-h-screen bg-[#EEEEF2] px-4 pb-28 pt-6 text-[#0A0A0A] dark:bg-[#0A0A0A] dark:text-white md:px-8 md:pb-12">
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="rounded-[16px] border border-[#D0D0D8] bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.08)] dark:border-[#2A2A2A] dark:bg-[#141414] dark:shadow-none">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-[#CCFF00]">Historico</p>
              <h2 className="mt-2 text-2xl font-bold text-[#0A0A0A] dark:text-white">Meus Palpites</h2>
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
                  'cursor-pointer rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wide transition-all duration-150 active:scale-95',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CCFF00]',
                  isActive
                    ? 'bg-[#CCFF00] text-black'
                    : 'border border-[#D0D0D8] bg-white text-[#555566] shadow-[0_2px_8px_rgba(0,0,0,0.05)] hover:bg-[#CCFF00]/20 hover:text-[#0A0A0A] dark:border-[#2A2A2A] dark:bg-transparent dark:text-gray-400 dark:shadow-none dark:hover:bg-[#CCFF00]/20 dark:hover:text-white',
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

        {isInitialLoading ? (
          <div className="rounded-[16px] border border-[#D0D0D8] bg-white p-10 text-center text-sm text-[#555566] shadow-[0_2px_8px_rgba(0,0,0,0.08)] dark:border-[#2A2A2A] dark:bg-[#141414] dark:text-gray-300 dark:shadow-none">
            Carregando seus palpites...
          </div>
        ) : filteredPredictions.length === 0 ? (
          <div className="rounded-[16px] border border-dashed border-[#D0D0D8] bg-white p-10 text-center text-sm text-[#555566] shadow-[0_2px_8px_rgba(0,0,0,0.08)] dark:border-[#2A2A2A] dark:bg-[#141414] dark:text-gray-400 dark:shadow-none">
            Nenhum palpite encontrado para este filtro.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {filteredPredictions.map((prediction) => {
              const status = predictionStatus(prediction);
              const isExact = prediction.points === 25;

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

                  <p className="text-xs uppercase tracking-wide text-[#555566] dark:text-gray-500">{prediction.matches.round}</p>
                  <h3 className="mt-2 text-lg font-bold text-[#0A0A0A] dark:text-white">
                    {prediction.matches.home_team} x {prediction.matches.away_team}
                  </h3>

                  <div className="mt-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-[#555566] dark:text-gray-500">Meu palpite</p>
                      <p className="mt-1 text-2xl font-bold text-[#0A0A0A] dark:text-white">
                        {prediction.home_score} x {prediction.away_score}
                      </p>
                    </div>

                    {status === 'pendente' || status === 'ao_vivo' ? (
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                          status === 'ao_vivo'
                            ? 'bg-[#FF007F] text-white'
                            : 'bg-[#E8E8F0] text-[#555566] dark:border dark:border-[#2A2A2A] dark:bg-transparent dark:text-gray-300'
                        }`}
                      >
                        {status === 'ao_vivo' ? 'Ao Vivo' : 'Pendente'}
                      </span>
                    ) : (
                      <span className="rounded-full bg-[#E8E8F0] px-3 py-1 text-xs font-bold text-[#0A0A0A] dark:bg-[#1C1C1C] dark:text-white">
                        {prediction.points ?? 0} pts
                      </span>
                    )}
                  </div>

                  {(status === 'acerto' || status === 'erro') && (
                    <p className="mt-3 text-xs text-[#555566] dark:text-gray-400">
                      Real: {prediction.matches.home_score ?? '--'} x {prediction.matches.away_score ?? '--'}
                    </p>
                  )}

                  {isExact ? (
                    <span className="mt-4 inline-flex rounded-full bg-[#CCFF00] px-3 py-1 text-xs font-bold uppercase tracking-wide text-black">
                      Cravada!
                    </span>
                  ) : null}

                  {prediction.matches.status === 'pendente' ? (
                    <div className="mt-4">
                      <button
                        className="inline-flex cursor-pointer items-center rounded-full border border-[#D0D0D8] bg-white px-4 py-2 text-sm font-bold uppercase tracking-wide text-[#555566] shadow-[0_2px_8px_rgba(0,0,0,0.05)] transition-all duration-150 hover:bg-[#2A2A2A] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CCFF00] active:scale-95 dark:border-[#2A2A2A] dark:bg-[#1C1C1C] dark:text-gray-300 dark:shadow-none"
                        onClick={() => navigateToMatch(prediction.match_id)}
                        type="button"
                      >
                        Editar
                      </button>
                    </div>
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
