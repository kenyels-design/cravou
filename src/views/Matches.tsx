import { useCallback, useEffect, useMemo, useState } from 'react';
import QuickBetMode from '../components/QuickBetMode';
import { FeedbackBanner } from '../components/ui/FeedbackBanner';
import { useAuth } from '../context/AuthContext';
import { formatMatchKickoff, formatMatchKickoffTime, getFlagCode } from '../lib/display';
import { getMatches, getMyPredictions } from '../lib/matches';
import type { Sprint3MatchRecord, Sprint3MatchStatus, Sprint3PredictionRecord } from '../lib/types';

type MatchFilter = 'todos' | 'ao_vivo' | 'pendente' | 'finalizado';

const filterLabels: Record<MatchFilter, string> = {
  todos: 'Todos',
  ao_vivo: 'Ao Vivo',
  pendente: 'Pendentes',
  finalizado: 'Encerrados',
};

function groupMatchesByRound(matches: Sprint3MatchRecord[]) {
  return matches.reduce<Record<string, Sprint3MatchRecord[]>>((groups, match) => {
    groups[match.round] ??= [];
    groups[match.round].push(match);
    return groups;
  }, {});
}

function matchesFilter(match: Sprint3MatchRecord, filter: MatchFilter) {
  if (filter === 'todos') {
    return true;
  }

  if (filter === 'finalizado') {
    return match.status === 'finalizado' || match.status === 'aguardando_resultado';
  }

  return match.status === filter;
}

function statusLabel(status: Sprint3MatchStatus) {
  if (status === 'ao_vivo') {
    return 'AO VIVO';
  }

  if (status === 'pendente') {
    return 'PENDENTE';
  }

  if (status === 'aguardando_resultado') {
    return 'AGUARDANDO';
  }

  return 'ENCERRADO';
}

function renderFlag(flag: string | null, fallback: string) {
  const code = getFlagCode(flag);

  if (code) {
    return (
      <span
        aria-hidden="true"
        className={`fi fi-${code} rounded-full`}
        style={{ width: 48, height: 48, display: 'inline-block' }}
      />
    );
  }

  return <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#2A2A2A] text-base font-bold">{fallback}</span>;
}

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function cardClass(status: Sprint3MatchStatus) {
  if (status === 'ao_vivo') {
    return 'bg-[#0D2B0D] border border-[#1A4A1A]';
  }

  if (status === 'pendente') {
    return 'bg-[#141414] border border-[#2A2A2A]';
  }

  return 'bg-[#0F0F0F] border border-[#1A1A1A] opacity-70';
}

function realScoreText(match: Sprint3MatchRecord) {
  if (match.home_score == null || match.away_score == null) {
    return '--';
  }

  return `${match.home_score} x ${match.away_score}`;
}

export default function Matches() {
  const { user } = useAuth();
  const [matches, setMatches] = useState<Sprint3MatchRecord[]>([]);
  const [predictions, setPredictions] = useState<Record<string, Sprint3PredictionRecord>>({});
  const [quickBetMatches, setQuickBetMatches] = useState<Sprint3MatchRecord[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<MatchFilter>('todos');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!user) {
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const [matchRows, predictionRows] = await Promise.all([getMatches(), getMyPredictions()]);

      setMatches(matchRows);
      setPredictions(
        predictionRows.reduce<Record<string, Sprint3PredictionRecord>>((accumulator, prediction) => {
          accumulator[prediction.match_id] = prediction;
          return accumulator;
        }, {}),
      );
    } catch (error) {
      const message =
        error && typeof error === 'object' && 'message' in error
          ? String(error.message)
          : 'Nao foi possivel carregar os jogos agora.';
      setErrorMessage(message);
      setMatches([]);
      setPredictions({});
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const groupedMatches = useMemo(
    () => groupMatchesByRound(matches.filter((match) => matchesFilter(match, activeFilter))),
    [activeFilter, matches],
  );
  const pendingMatchesWithoutPrediction = useMemo(
    () => matches.filter((match) => match.status === 'pendente' && !predictions[match.id]),
    [matches, predictions],
  );

  const navigateToMatch = (matchId: string) => {
    window.location.hash = `#match/${matchId}`;
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] px-4 pb-28 pt-6 text-white md:px-8 md:pb-12">
      <div className="mx-auto max-w-6xl space-y-4">
        <header className="rounded-[16px] border border-[#2A2A2A] bg-[#141414] p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-[#FF007F]">Jogos</p>
              <h1 className="mt-3 text-3xl font-bold uppercase tracking-wide text-white">Painel de confrontos</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-400">
                Explore os jogos da Copa, acompanhe o status da rodada e deixe seus palpites enquanto as partidas ainda
                estiverem pendentes.
              </p>
            </div>

            {pendingMatchesWithoutPrediction.length > 0 ? (
              <button
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#CCFF00] px-5 py-3 text-sm font-bold uppercase tracking-wide text-black transition hover:bg-[#CCFF00]/90"
                onClick={() => setQuickBetMatches(pendingMatchesWithoutPrediction)}
                type="button"
              >
                ⚡ Modo Rapido
              </button>
            ) : null}
          </div>
        </header>

        <div className="flex flex-wrap gap-2">
          {(Object.keys(filterLabels) as MatchFilter[]).map((filter) => {
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
            Carregando jogos e palpites...
          </div>
        ) : Object.keys(groupedMatches).length === 0 ? (
          <div className="rounded-[16px] border border-dashed border-[#2A2A2A] bg-[#141414] p-10 text-center text-sm text-gray-400">
            Nenhum jogo encontrado para este filtro.
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedMatches).map(([round, roundMatches]) => (
              <section className="space-y-4" key={round}>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Rodada</p>
                    <h2 className="mt-1 text-2xl font-bold uppercase tracking-wide text-white">{round}</h2>
                  </div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">{roundMatches.length} jogos</p>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  {roundMatches.map((match) => {
                    const prediction = predictions[match.id] ?? null;
                    const showResolvedData = match.status === 'ao_vivo' || match.status === 'finalizado';

                    return (
                      <article
                        className={`cursor-pointer rounded-[16px] p-5 transition hover:-translate-y-0.5 ${cardClass(match.status)}`}
                        key={match.id}
                        onClick={() => navigateToMatch(match.id)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            navigateToMatch(match.id);
                          }
                        }}
                        role="link"
                        tabIndex={0}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs uppercase tracking-wide text-gray-500">{match.round}</p>
                            {match.status === 'pendente' ? (
                              <p className="mt-2 text-xs text-gray-400">{formatMatchKickoff(match.match_time)}</p>
                            ) : null}
                          </div>

                          <span
                            className={`rounded-full px-2 py-1 text-xs font-bold uppercase tracking-wide ${
                              match.status === 'ao_vivo'
                                ? 'bg-[#FF007F] text-white'
                                : match.status === 'pendente'
                                  ? 'border border-[#2A2A2A] text-gray-400'
                                  : 'border border-[#1A1A1A] text-gray-400'
                            }`}
                          >
                            {statusLabel(match.status)}
                          </span>
                        </div>

                        <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                          <div className="text-center">
                            <div className="mx-auto flex justify-center">{renderFlag(match.home_flag, initials(match.home_team))}</div>
                            <p className="mt-2 text-sm font-semibold text-white">{match.home_team}</p>
                          </div>

                          <div className="text-center">
                            <p
                              className={`text-4xl font-extrabold ${
                                match.status === 'ao_vivo'
                                  ? 'text-[#CCFF00]'
                                  : match.status === 'pendente'
                                    ? 'text-white'
                                    : 'text-gray-400'
                              }`}
                            >
                              {match.status === 'pendente'
                                ? formatMatchKickoffTime(match.match_time)
                                : realScoreText(match)}
                            </p>
                          </div>

                          <div className="text-center">
                            <div className="mx-auto flex justify-center">{renderFlag(match.away_flag, initials(match.away_team))}</div>
                            <p className="mt-2 text-sm font-semibold text-white">{match.away_team}</p>
                          </div>
                        </div>

                        {prediction ? (
                          <div className="mt-5 rounded-[16px] border border-[#2A2A2A] bg-black/20 p-4">
                            {showResolvedData ? (
                              <div className="space-y-3">
                                <div className="flex items-center justify-between gap-3">
                                  <span className="text-xs uppercase tracking-wide text-gray-500">Meu palpite</span>
                                  <span className="rounded-full bg-[#1C1C1C] px-3 py-1 text-xs font-bold text-white">
                                    {prediction.home_score} x {prediction.away_score}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                  <span className="text-xs uppercase tracking-wide text-gray-500">Pontos</span>
                                  <span className="rounded-full bg-[#CCFF00] px-3 py-1 text-xs font-bold text-black">
                                    {prediction.points ?? '--'}
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-xs uppercase tracking-wide text-gray-500">Palpite salvo</span>
                                <span className="rounded-full bg-[#1C1C1C] px-3 py-1 text-xs font-bold text-white">
                                  {prediction.home_score} x {prediction.away_score}
                                </span>
                              </div>
                            )}
                          </div>
                        ) : null}

                        {match.status === 'pendente' ? (
                          <div className={prediction ? 'mt-5' : 'mt-4'}>
                            <button
                              className="inline-flex items-center rounded-full border border-[#2A2A2A] bg-[#1C1C1C] px-4 py-2 text-sm font-bold uppercase tracking-wide text-gray-300"
                              onClick={(event) => {
                                event.stopPropagation();
                                navigateToMatch(match.id);
                              }}
                              type="button"
                            >
                              {prediction ? 'Editar' : 'Palpitar'}
                            </button>
                          </div>
                        ) : match.status === 'ao_vivo' ? (
                          <div className={prediction ? 'mt-5' : 'mt-4'}>
                            <button
                              className="inline-flex items-center gap-2 rounded-full bg-[#CCFF00] px-4 py-2 text-sm font-bold uppercase tracking-wide text-black"
                              onClick={(event) => {
                                event.stopPropagation();
                                navigateToMatch(match.id);
                              }}
                              type="button"
                            >
                              <span aria-hidden="true">⚡</span>
                              Palpitar
                            </button>
                          </div>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      {quickBetMatches ? (
        <QuickBetMode
          matches={quickBetMatches}
          onClose={() => setQuickBetMatches(null)}
          onPredictionSaved={(prediction) => {
            setPredictions((current) => ({
              ...current,
              [prediction.match_id]: prediction,
            }));
          }}
        />
      ) : null}
    </div>
  );
}
