import { useCallback, useEffect, useMemo, useState } from 'react';
import QuickBetMode from '../components/QuickBetMode';
import { FeedbackBanner } from '../components/ui/FeedbackBanner';
import { useAuth } from '../context/AuthContext';
import { formatMatchKickoff, formatMatchKickoffTime, getFlagCode } from '../lib/display';
import { getMatches, getMyPredictions } from '../lib/matches';
import type { Sprint3MatchRecord, Sprint3MatchStatus, Sprint3PredictionRecord } from '../lib/types';

type MatchFilter = 'todos' | 'ao_vivo' | 'pendente' | 'finalizado' | 'sem_palpite';

const filterLabels: Record<MatchFilter, string> = {
  todos: 'Todos',
  ao_vivo: 'Ao Vivo',
  pendente: 'Pendentes',
  finalizado: 'Encerrados',
  sem_palpite: 'Sem Palpite',
};

function getRoundDeadline(matches: Array<Sprint3MatchRecord | null | undefined>) {
  const firstMatchTime = matches.reduce<number | null>((earliest, match) => {
    if (!match) {
      return earliest;
    }

    const matchTime = new Date(match.match_time).getTime();

    if (Number.isNaN(matchTime)) {
      return earliest;
    }

    if (earliest == null || matchTime < earliest) {
      return matchTime;
    }

    return earliest;
  }, null);

  if (firstMatchTime == null) {
    return null;
  }

  return firstMatchTime - 60 * 60 * 1000;
}

function groupMatchesByRound(matches: Array<Sprint3MatchRecord | null | undefined>) {
  const groups = matches.reduce<Record<string, Sprint3MatchRecord[]>>((accumulator, match) => {
    if (!match) {
      return accumulator;
    }

    accumulator[match.round] ??= [];
    accumulator[match.round].push(match);
    return accumulator;
  }, {});

  return Object.entries(groups).map(([round, roundMatches]) => ({
    round,
    matches: roundMatches,
    deadline: getRoundDeadline(roundMatches),
  }));
}

function matchesFilter(
  match: Sprint3MatchRecord | null | undefined,
  filter: MatchFilter,
  predictions: Record<string, Sprint3PredictionRecord> | null | undefined,
) {
  if (!match) {
    return false;
  }

  if (filter === 'todos') {
    return true;
  }

  if (filter === 'sem_palpite') {
    return match?.status === 'pendente' && !predictions?.[match?.id];
  }

  if (filter === 'finalizado') {
    return match?.status === 'finalizado' || match?.status === 'aguardando_resultado';
  }

  return match?.status === filter;
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

function cardClass(status: Sprint3MatchStatus | null | undefined) {
  if (status === 'ao_vivo') {
    return 'border border-[#C8E3A6] bg-[#F6FFE0] shadow-[0_2px_8px_rgba(0,0,0,0.08)] dark:bg-[#0D2B0D] dark:border-[#1A4A1A]';
  }

  if (status === 'pendente') {
    return 'border border-[#D0D0D8] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.08)] dark:bg-[#141414] dark:border-[#2A2A2A]';
  }

  return 'border border-[#D0D0D8] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.08)] dark:bg-[#0F0F0F] dark:border-[#1A1A1A] dark:opacity-70';
}

function realScoreText(match: Sprint3MatchRecord) {
  if (match.home_score == null || match.away_score == null) {
    return '--';
  }

  return `${match.home_score} x ${match.away_score}`;
}

function roundClosingLabel(deadline: number | null, now: number) {
  if (deadline == null) {
    return null;
  }

  const diffMs = deadline - now;

  if (diffMs <= 0) {
    return 'Encerrado para apostas';
  }

  const hoursLeft = Math.ceil(diffMs / (1000 * 60 * 60));
  return `Fecha em ${hoursLeft} hora${hoursLeft === 1 ? '' : 's'}`;
}

export default function Matches() {
  const { user } = useAuth();
  const [matches, setMatches] = useState<Sprint3MatchRecord[]>([]);
  const [predictions, setPredictions] = useState<Record<string, Sprint3PredictionRecord>>({});
  const [quickBetMatches, setQuickBetMatches] = useState<Sprint3MatchRecord[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<MatchFilter>('todos');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

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

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 60000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  const safeMatches = useMemo(
    () => (matches ?? []).filter((match): match is Sprint3MatchRecord => Boolean(match)),
    [matches],
  );

  const groupedMatches = useMemo(
    () => groupMatchesByRound(safeMatches.filter((match) => matchesFilter(match, activeFilter, predictions))),
    [activeFilter, predictions, safeMatches],
  );
  const pendingMatchesWithoutPrediction = useMemo(
    () => safeMatches.filter((match) => match?.status === 'pendente' && !predictions?.[match?.id]),
    [predictions, safeMatches],
  );

  const navigateToMatch = (matchId: string) => {
    window.location.hash = `#match/${matchId}`;
  };

  return (
    <div className="min-h-screen bg-[#EEEEF2] px-4 pb-28 pt-6 text-[#0A0A0A] dark:bg-[#0A0A0A] dark:text-white md:px-8 md:pb-12">
      <div className="mx-auto max-w-6xl space-y-4">
        <header className="rounded-[16px] border border-[#D0D0D8] bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.08)] dark:border-[#2A2A2A] dark:bg-[#141414] dark:shadow-none">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-[#FF007F]">Jogos</p>
              <h1 className="mt-3 text-3xl font-bold uppercase tracking-wide text-[#0A0A0A] dark:text-white">Painel de confrontos</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-[#555566] dark:text-gray-400">
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
                {'\u26A1'} Modo Rapido
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
                    : 'border border-[#D0D0D8] bg-white text-[#555566] shadow-[0_2px_8px_rgba(0,0,0,0.05)] hover:text-[#0A0A0A] dark:border-[#2A2A2A] dark:bg-transparent dark:text-gray-400 dark:shadow-none dark:hover:text-white',
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
          <div className="rounded-[16px] border border-[#D0D0D8] bg-white p-10 text-center text-sm text-[#555566] shadow-[0_2px_8px_rgba(0,0,0,0.08)] dark:border-[#2A2A2A] dark:bg-[#141414] dark:text-gray-300 dark:shadow-none">
            Carregando jogos e palpites...
          </div>
        ) : groupedMatches.length === 0 ? (
          <div className="rounded-[16px] border border-dashed border-[#D0D0D8] bg-white p-10 text-center text-sm text-[#555566] shadow-[0_2px_8px_rgba(0,0,0,0.08)] dark:border-[#2A2A2A] dark:bg-[#141414] dark:text-gray-400 dark:shadow-none">
            Nenhum jogo encontrado para este filtro.
          </div>
        ) : (
          <div className="space-y-6">
            {groupedMatches.map(({ deadline, matches: roundMatches, round }) => (
              <section className="space-y-4" key={round}>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-[#555566] dark:text-gray-500">Rodada</p>
                    <h2 className="mt-1 text-2xl font-bold uppercase tracking-wide text-[#0A0A0A] dark:text-white">{round}</h2>
                  </div>
                  <div className="text-right">
                    <p className="text-xs uppercase tracking-wide text-[#555566] dark:text-gray-500">{roundMatches.length} jogos</p>
                    {deadline != null ? (
                      <span
                        className={`mt-2 inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${
                          now >= deadline
                            ? 'border border-[#FF007F] bg-[#FFE3F1] text-[#FF007F] dark:bg-[#2A101A]'
                            : 'border border-[#D0D0D8] bg-[#E8E8F0] text-[#555566] dark:border-[#2A2A2A] dark:bg-[#141414] dark:text-[#CCFF00]'
                        }`}
                      >
                        {roundClosingLabel(deadline, now)}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  {roundMatches.map((match) => {
                    if (!match) {
                      return null;
                    }

                    const prediction = predictions?.[match?.id] ?? null;
                    const matchStatus = match?.status;
                    const showResolvedData = matchStatus === 'ao_vivo' || matchStatus === 'finalizado';
                    const bettingClosedForRound = deadline != null && now >= deadline;
                    const canQuickOpenMatch = matchStatus === 'pendente' && !bettingClosedForRound;

                    return (
                      <article
                        className={`cursor-pointer rounded-[16px] p-5 transition hover:-translate-y-0.5 ${cardClass(matchStatus)}`}
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
                            <p className="text-xs uppercase tracking-wide text-[#555566] dark:text-gray-500">{match.round}</p>
                            {matchStatus === 'pendente' ? (
                              <p className="mt-2 text-xs text-[#555566] dark:text-gray-400">{formatMatchKickoff(match.match_time)}</p>
                            ) : null}
                          </div>

                          <span
                            className={`rounded-full px-2 py-1 text-xs font-bold uppercase tracking-wide ${
                              matchStatus === 'ao_vivo'
                                ? 'bg-[#FF007F] text-white'
                              : matchStatus === 'pendente'
                                  ? 'bg-[#E8E8F0] text-[#555566] dark:border dark:border-[#2A2A2A] dark:bg-transparent dark:text-gray-300'
                                  : 'border border-[#D0D0D8] text-[#555566] dark:border-[#1A1A1A] dark:text-gray-400'
                            }`}
                          >
                            {statusLabel(matchStatus ?? 'finalizado')}
                          </span>
                        </div>

                        <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                          <div className="text-center">
                            <div className="mx-auto flex justify-center">{renderFlag(match.home_flag, initials(match.home_team))}</div>
                            <p className="mt-2 text-sm font-semibold text-[#0A0A0A] dark:text-white">{match.home_team}</p>
                          </div>

                          <div className="text-center">
                            <p
                              className={`text-4xl font-extrabold ${
                                matchStatus === 'ao_vivo'
                                  ? 'text-[#CCFF00]'
                                  : matchStatus === 'pendente'
                                    ? 'text-[#0A0A0A] dark:text-white'
                                    : 'text-[#555566] dark:text-gray-400'
                              }`}
                            >
                              {matchStatus === 'pendente'
                                ? formatMatchKickoffTime(match.match_time)
                                : realScoreText(match)}
                            </p>
                          </div>

                          <div className="text-center">
                            <div className="mx-auto flex justify-center">{renderFlag(match.away_flag, initials(match.away_team))}</div>
                            <p className="mt-2 text-sm font-semibold text-[#0A0A0A] dark:text-white">{match.away_team}</p>
                          </div>
                        </div>

                        {prediction ? (
                          <div className="mt-5 rounded-[16px] border border-[#D0D0D8] bg-[#F6F6FA] p-4 dark:border-[#2A2A2A] dark:bg-black/20">
                            {showResolvedData ? (
                              <div className="space-y-3">
                                <div className="flex items-center justify-between gap-3">
                                  <span className="text-xs uppercase tracking-wide text-[#555566] dark:text-gray-500">Meu palpite</span>
                                  <span className="rounded-full bg-[#E8E8F0] px-3 py-1 text-xs font-bold text-[#0A0A0A] dark:bg-[#1C1C1C] dark:text-white">
                                    {prediction.home_score} x {prediction.away_score}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                  <span className="text-xs uppercase tracking-wide text-[#555566] dark:text-gray-500">Pontos</span>
                                  <span className="rounded-full bg-[#CCFF00] px-3 py-1 text-xs font-bold text-black">
                                    {prediction.points ?? '--'}
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-xs uppercase tracking-wide text-[#555566] dark:text-gray-500">Palpite salvo</span>
                                <span className="rounded-full bg-[#E8E8F0] px-3 py-1 text-xs font-bold text-[#0A0A0A] dark:bg-[#1C1C1C] dark:text-white">
                                  {prediction.home_score} x {prediction.away_score}
                                </span>
                              </div>
                            )}
                          </div>
                        ) : null}

                        {matchStatus === 'pendente' ? (
                          <div className={prediction ? 'mt-5' : 'mt-4'}>
                            <button
                              className="inline-flex items-center rounded-full border border-[#D0D0D8] bg-white px-4 py-2 text-sm font-bold uppercase tracking-wide text-[#555566] shadow-[0_2px_8px_rgba(0,0,0,0.05)] disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#2A2A2A] dark:bg-[#1C1C1C] dark:text-gray-300 dark:shadow-none"
                              disabled={!canQuickOpenMatch}
                              onClick={(event) => {
                                event.stopPropagation();
                                if (!canQuickOpenMatch) {
                                  return;
                                }
                                navigateToMatch(match.id);
                              }}
                              type="button"
                            >
                              {bettingClosedForRound ? 'Encerrado' : prediction ? 'Editar' : 'Palpitar'}
                            </button>
                          </div>
                        ) : matchStatus === 'ao_vivo' ? (
                          <div className={prediction ? 'mt-5' : 'mt-4'}>
                            <button
                              className="inline-flex items-center gap-2 rounded-full bg-[#CCFF00] px-4 py-2 text-sm font-bold uppercase tracking-wide text-black"
                              onClick={(event) => {
                                event.stopPropagation();
                                navigateToMatch(match.id);
                              }}
                              type="button"
                            >
                              <span aria-hidden="true">{'\u26A1'}</span>
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
