import { useCallback, useEffect, useMemo, useState } from 'react';
import { FeedbackBanner } from '../components/ui/FeedbackBanner';
import { useAuth } from '../context/AuthContext';
import { CURIOSITIES } from '../lib/curiosities';
import { formatMatchKickoff, getFlagCode } from '../lib/display';
import {
  getLeaderboard,
  getMatches,
  getMyPredictions,
  getRecentPredictionActivity,
  getRecentRankingMovements,
} from '../lib/matches';
import type {
  Sprint3LeaderboardEntry,
  Sprint3MatchRecord,
  Sprint3PredictionActivity,
  Sprint3PredictionWithMatchRecord,
  Sprint3RankingMovementActivity,
} from '../lib/types';

type HomeFeedItem =
  | {
      id: string;
      kind: 'prediction';
      timestamp: string;
      icon: string;
      accent: string;
      text: string;
    }
  | {
      id: string;
      kind: 'movement';
      timestamp: string;
      icon: string;
      accent: string;
      text: string;
    };

function relativeTime(timestamp: string) {
  const diffMs = Date.now() - new Date(timestamp).getTime();

  if (diffMs < 60000) {
    return 'agora';
  }

  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 60) {
    return `${diffMinutes}min atras`;
  }

  const diffHours = Math.floor(diffMinutes / 60);

  if (diffHours < 24) {
    return `${diffHours}h atras`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d atras`;
}

function deadlineLabel(matchTime: string) {
  const diffMs = new Date(matchTime).getTime() - 60 * 60 * 1000 - Date.now();

  if (diffMs <= 0) {
    return 'Apostas encerram em instantes';
  }

  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 60) {
    return `Apostas ate ${diffMinutes}min`;
  }

  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;

  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `Apostas ate ${days}d ${hours % 24}h`;
  }

  return `Apostas ate ${hours}h ${minutes}min`;
}

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function renderCompactFlag(flag: string | null, fallback: string) {
  const code = getFlagCode(flag);

  if (code) {
    return (
      <span className="flex h-7 w-7 shrink-0 items-center justify-center">
        <span
          aria-hidden="true"
          className={`fi fi-${code} rounded-full`}
          style={{ width: '100%', height: '100%', display: 'inline-block' }}
        />
      </span>
    );
  }

  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#E8E8F0] text-[10px] font-black text-[#555566] dark:bg-[#2A2A2A] dark:text-white">
      {fallback}
    </span>
  );
}

function rankPosition(
  totalsByUser: Record<string, number>,
  namesByUser: Record<string, string>,
  targetUserId: string,
) {
  const ordered = Object.keys(totalsByUser).sort((left, right) => {
    if (totalsByUser[right] !== totalsByUser[left]) {
      return totalsByUser[right] - totalsByUser[left];
    }

    return (namesByUser[left] ?? 'Sem nome').localeCompare(namesByUser[right] ?? 'Sem nome', 'pt-BR');
  });

  const index = ordered.indexOf(targetUserId);
  return index >= 0 ? index + 1 : null;
}

function buildFeedItems(
  predictionActivity: Sprint3PredictionActivity[],
  rankingMovements: Sprint3RankingMovementActivity[],
  leaderboard: Sprint3LeaderboardEntry[],
) {
  const predictionItems: HomeFeedItem[] = predictionActivity.map((item) => ({
    id: `prediction-${item.prediction_id}`,
    kind: 'prediction',
    timestamp: item.created_at,
    icon: 'P',
    accent: 'text-[#CCFF00]',
    text: `${item.user_name} apostou em ${item.home_team} x ${item.away_team}`,
  }));

  const namesByUser = leaderboard.reduce<Record<string, string>>((accumulator, entry) => {
    accumulator[entry.user_id] = entry.nome;
    return accumulator;
  }, {});

  const rollingTotals = leaderboard.reduce<Record<string, number>>((accumulator, entry) => {
    accumulator[entry.user_id] = entry.total_points;
    return accumulator;
  }, {});

  const movementItems: HomeFeedItem[] = [];

  rankingMovements.forEach((movement) => {
    const currentTotal = rollingTotals[movement.user_id] ?? 0;
    const afterRank = rankPosition(rollingTotals, namesByUser, movement.user_id);

    rollingTotals[movement.user_id] = currentTotal - movement.points;
    const beforeRank = rankPosition(rollingTotals, namesByUser, movement.user_id);
    rollingTotals[movement.user_id] = currentTotal - movement.points;

    if (afterRank != null && beforeRank != null && afterRank < beforeRank) {
      movementItems.push({
        id: `movement-${movement.prediction_id}`,
        kind: 'movement',
        timestamp: movement.updated_at,
        icon: '#',
        accent: 'text-[#FF007F]',
        text: `${movement.user_name} subiu para o ${afterRank}o lugar`,
      });
    }
  });

  return [...predictionItems, ...movementItems]
    .sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime())
    .slice(0, 10);
}

export default function Home() {
  const { profile, user } = useAuth();
  const [matches, setMatches] = useState<Sprint3MatchRecord[]>([]);
  const [predictions, setPredictions] = useState<Sprint3PredictionWithMatchRecord[]>([]);
  const [leaderboard, setLeaderboard] = useState<Sprint3LeaderboardEntry[]>([]);
  const [predictionActivity, setPredictionActivity] = useState<Sprint3PredictionActivity[]>([]);
  const [rankingMovements, setRankingMovements] = useState<Sprint3RankingMovementActivity[]>([]);
  const [selectedCuriosity, setSelectedCuriosity] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadHome = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const [matchRows, predictionRows, leaderboardRows, activityRows, movementRows] = await Promise.all([
        getMatches(),
        getMyPredictions(),
        getLeaderboard(),
        getRecentPredictionActivity(10),
        getRecentRankingMovements(10),
      ]);

      setMatches(matchRows);
      setPredictions(predictionRows);
      setLeaderboard(leaderboardRows);
      setPredictionActivity(activityRows);
      setRankingMovements(movementRows);
    } catch (error) {
      const message =
        error && typeof error === 'object' && 'message' in error
          ? String(error.message)
          : 'Nao foi possivel carregar a tela inicial agora.';
      setErrorMessage(message);
      setMatches([]);
      setPredictions([]);
      setLeaderboard([]);
      setPredictionActivity([]);
      setRankingMovements([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHome();
  }, [loadHome]);

  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * CURIOSITIES.length);
    setSelectedCuriosity(CURIOSITIES[randomIndex] ?? '');
  }, []);

  const safeMatches = useMemo(
    () =>
      (matches ?? [])
        .filter((match): match is Sprint3MatchRecord => Boolean(match))
        .sort((left, right) => new Date(left.match_time).getTime() - new Date(right.match_time).getTime()),
    [matches],
  );

  const nextPendingMatches = useMemo(
    () =>
      safeMatches.filter((match) => match.status === 'pendente' && new Date(match.match_time).getTime() > Date.now()),
    [safeMatches],
  );

  const upcomingHomeMatches = useMemo(() => nextPendingMatches.slice(0, 5), [nextPendingMatches]);
  const featuredMatch = upcomingHomeMatches[0] ?? null;
  const predictionByMatchId = useMemo(
    () =>
      predictions.reduce<Record<string, Sprint3PredictionWithMatchRecord>>((accumulator, prediction) => {
        accumulator[prediction.match_id] = prediction;
        return accumulator;
      }, {}),
    [predictions],
  );

  const myStats = useMemo(() => {
    const totalPoints = predictions.reduce((sum, prediction) => sum + (prediction.points ?? 0), 0);
    const rankingPosition = leaderboard.findIndex((entry) => entry.user_id === user?.id);

    return {
      totalPoints,
      rankingPosition: rankingPosition >= 0 ? rankingPosition + 1 : null,
      totalPredictions: predictions.length,
    };
  }, [leaderboard, predictions, user?.id]);

  const topThree = useMemo(() => leaderboard.slice(0, 3), [leaderboard]);
  const feedItems = useMemo(
    () => buildFeedItems(predictionActivity, rankingMovements, leaderboard),
    [leaderboard, predictionActivity, rankingMovements],
  );

  return (
    <div className="min-h-screen bg-[#F5F5F5] px-4 pb-28 pt-6 text-[#0A0A0A] dark:bg-[#0A0A0A] dark:text-white md:px-8 md:pb-12">
      <div className="mx-auto max-w-6xl space-y-5">
        {errorMessage ? <FeedbackBanner message={errorMessage} tone="error" /> : null}

        {loading ? (
          <div className="rounded-[28px] border border-[#E0E0E0] bg-white p-10 text-center text-sm text-zinc-600 dark:border-[#2A2A2A] dark:bg-[#141414] dark:text-gray-400">
            Carregando tela inicial...
          </div>
        ) : (
          <>
            <div className="flex justify-center md:justify-start">
              <img
                alt="Camerite na Copa"
                className="h-16 w-auto object-contain"
                src="/logos/Camerite_vertical.png"
              />
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <div className="space-y-5 lg:col-span-2">
                <section className="rounded-[28px] border border-[#E0E0E0] bg-white p-6 shadow-[0_20px_60px_rgba(0,0,0,0.08)] dark:border-[#2A2A2A] dark:bg-[#141414] dark:shadow-[0_20px_60px_rgba(0,0,0,0.28)]">
                  <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#CCFF00]">Resumo pessoal</p>
                  <h1 className="mt-4 text-3xl font-black tracking-tight text-[#0A0A0A] dark:text-white">
                    Ola, {profile?.nome ?? user?.email?.split('@')[0] ?? 'Camerite'}!
                  </h1>
                  <p className="mt-2 text-sm text-zinc-600 dark:text-gray-400">
                    Seu painel rapido para acompanhar pontuacao, proximos palpites e sua posicao na disputa.
                  </p>

                  <div className="mt-6 grid gap-3 sm:grid-cols-3">
                    <article className="rounded-[22px] border border-[#E0E0E0] bg-white p-4 dark:border-[#2A2A2A] dark:bg-[#141414]">
                      <p className="text-xs uppercase tracking-[0.18em] text-zinc-500 dark:text-gray-500">Pontuacao total</p>
                      <p className="mt-3 text-3xl font-black text-[#CCFF00]">{myStats.totalPoints}</p>
                    </article>
                    <article className="rounded-[22px] border border-[#E0E0E0] bg-white p-4 dark:border-[#2A2A2A] dark:bg-[#141414]">
                      <p className="text-xs uppercase tracking-[0.18em] text-zinc-500 dark:text-gray-500">Posicao no ranking</p>
                      <p className="mt-3 text-3xl font-black text-[#0A0A0A] dark:text-white">
                        {myStats.rankingPosition ? `${myStats.rankingPosition}o` : '--'}
                      </p>
                    </article>
                    <article className="rounded-[22px] border border-[#E0E0E0] bg-white p-4 dark:border-[#2A2A2A] dark:bg-[#141414]">
                      <p className="text-xs uppercase tracking-[0.18em] text-zinc-500 dark:text-gray-500">Palpites feitos</p>
                      <p className="mt-3 text-3xl font-black text-[#0A0A0A] dark:text-white">{myStats.totalPredictions}</p>
                    </article>
                  </div>

                  <div className="mt-5 rounded-[24px] border border-[#E0E0E0] bg-[radial-gradient(circle_at_top_left,_rgba(204,255,0,0.12),_transparent_35%),#FFFFFF] p-5 dark:border-[#2A2A2A] dark:bg-[radial-gradient(circle_at_top_left,_rgba(204,255,0,0.12),_transparent_35%),#141414]">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-zinc-500 dark:text-gray-500">Proximos jogos</p>
                        {featuredMatch ? (
                          <p className="mt-2 inline-flex rounded-full border border-[#FF007F]/30 bg-[#FF007F]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-[#FF66B2]">
                            {deadlineLabel(featuredMatch.match_time)}
                          </p>
                        ) : null}
                      </div>
                      <span className="rounded-full border border-[#CCFF00]/30 bg-[#CCFF00]/10 px-3 py-1 text-xs font-black text-[#6A8400] dark:text-[#CCFF00]">
                        {upcomingHomeMatches.length}
                      </span>
                    </div>

                    {upcomingHomeMatches.length > 0 ? (
                      <div className="mt-4 space-y-2">
                        {upcomingHomeMatches.map((match) => {
                          const hasPrediction = Boolean(predictionByMatchId[match.id]);

                          return (
                            <a
                              className="grid min-h-[68px] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-[18px] border border-[#E0E0E0] bg-white px-3 py-2 transition hover:-translate-y-0.5 hover:border-[#CCFF00]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CCFF00] dark:border-[#2A2A2A] dark:bg-[#101010]"
                              href={`#match/${match.id}`}
                              key={match.id}
                            >
                              <div className="min-w-0">
                                <div className="grid grid-cols-[28px_minmax(0,1fr)] items-center gap-2">
                                  {renderCompactFlag(match.home_flag, initials(match.home_team))}
                                  <p className="truncate text-sm font-bold text-[#0A0A0A] dark:text-white">{match.home_team}</p>
                                </div>
                                <div className="mt-1 grid grid-cols-[28px_minmax(0,1fr)] items-center gap-2">
                                  {renderCompactFlag(match.away_flag, initials(match.away_team))}
                                  <p className="truncate text-sm font-bold text-[#0A0A0A] dark:text-white">{match.away_team}</p>
                                </div>
                              </div>

                              <div className="flex min-w-[84px] flex-col items-end gap-2 text-right">
                                <span className="text-xs font-semibold text-zinc-600 dark:text-gray-400">
                                  {formatMatchKickoff(match.match_time)}
                                </span>
                                {hasPrediction ? (
                                  <span
                                    aria-label="Palpite salvo"
                                    className="flex h-6 w-6 items-center justify-center rounded-full bg-[#CCFF00] text-xs font-black text-black"
                                  >
                                    ✓
                                  </span>
                                ) : (
                                  <span
                                    aria-label="Sem palpite salvo"
                                    className="h-6 w-6 rounded-full border border-[#D0D0D8] bg-[#F6F6FA] dark:border-[#2A2A2A] dark:bg-[#1C1C1C]"
                                  />
                                )}
                              </div>
                            </a>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-zinc-600 dark:text-gray-400">Nenhum jogo pendente encontrado no momento.</p>
                    )}
                  </div>
                </section>

                <section className="min-h-[168px] rounded-[28px] border-2 border-[#CCFF00] bg-[radial-gradient(circle_at_top_left,_rgba(204,255,0,0.2),_transparent_38%),#FFFFFF] p-8 shadow-[0_0_24px_rgba(204,255,0,0.25),0_18px_50px_rgba(0,0,0,0.1)] dark:border-[#CCFF00]/80 dark:bg-[radial-gradient(circle_at_top_left,_rgba(204,255,0,0.22),_transparent_38%),#141414] dark:shadow-[0_0_32px_rgba(204,255,0,0.32),0_20px_60px_rgba(0,0,0,0.38)] md:min-h-[188px] md:p-9">
                  <div className="flex min-h-[104px] items-center gap-6">
                    <span className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-full border-2 border-[#CCFF00] bg-[#CCFF00]/18 text-4xl shadow-[0_0_28px_rgba(204,255,0,0.3)]">
                      🌎
                    </span>
                    <div className="min-w-0 max-w-5xl">
                      <p className="text-base font-black uppercase tracking-[0.36em] text-[#CCFF00] [text-shadow:0_1px_2px_rgba(0,0,0,0.45)] md:text-lg">
                        VOCÊ SABIA?
                      </p>
                      <p className="mt-4 text-lg leading-8 text-[#0A0A0A] dark:text-white md:text-xl md:leading-9">
                        {selectedCuriosity || CURIOSITIES[0]}
                      </p>
                    </div>
                  </div>
                </section>
              </div>

            <section className="rounded-[28px] border border-[#E0E0E0] bg-white p-6 shadow-[0_20px_60px_rgba(0,0,0,0.08)] dark:border-[#2A2A2A] dark:bg-[#141414] dark:shadow-[0_20px_60px_rgba(0,0,0,0.28)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#FF007F]">Movimentacoes</p>
                  <h2 className="mt-2 text-2xl font-black text-[#0A0A0A] dark:text-white">Ultimas atividades</h2>
                </div>
                <span className="rounded-full border border-[#E0E0E0] bg-white px-3 py-1 text-xs font-semibold text-zinc-600 dark:border-[#2A2A2A] dark:bg-[#141414] dark:text-gray-400">
                  {feedItems.length} itens
                </span>
              </div>

              <div className="mt-5 space-y-3">
                {feedItems.length > 0 ? (
                  feedItems.map((item) => (
                    <article
                      className="grid grid-cols-[40px_minmax(0,1fr)_auto] items-start gap-3 rounded-[22px] border border-[#E0E0E0] bg-white px-4 py-3 dark:border-[#2A2A2A] dark:bg-[#141414]"
                      key={item.id}
                    >
                      <div className={`flex h-10 w-10 items-center justify-center rounded-full bg-[#F5F5F5] text-sm font-black dark:bg-[#0A0A0A] ${item.accent}`}>
                        {item.icon}
                      </div>
                      <p className="pt-1 text-sm leading-6 text-[#0A0A0A] dark:text-white">{item.text}</p>
                      <span className="pt-1 text-xs text-zinc-500 dark:text-gray-500">{relativeTime(item.timestamp)}</span>
                    </article>
                  ))
                ) : (
                  <p className="text-sm text-zinc-600 dark:text-gray-400">Ainda nao ha atividades recentes para mostrar.</p>
                )}
              </div>
            </section>

            <section className="rounded-[28px] border border-[#E0E0E0] bg-white p-6 shadow-[0_20px_60px_rgba(0,0,0,0.08)] dark:border-[#2A2A2A] dark:bg-[#141414] dark:shadow-[0_20px_60px_rgba(0,0,0,0.28)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#CCFF00]">Ranking</p>
                  <h2 className="mt-2 text-2xl font-black text-[#0A0A0A] dark:text-white">Top 3 da rodada</h2>
                </div>
                <a
                  className="inline-flex cursor-pointer items-center justify-center rounded-full border border-[#CCFF00] px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[#CCFF00] transition-all duration-150 hover:bg-[#CCFF00] hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CCFF00] active:scale-95"
                  href="#ranking"
                >
                  Ver ranking completo
                </a>
              </div>

              <div className="mt-5 space-y-3">
                {topThree.length > 0 ? (
                  topThree.map((entry, index) => (
                    <article
                      className="grid grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 rounded-[22px] border border-[#E0E0E0] bg-white px-4 py-3 dark:border-[#2A2A2A] dark:bg-[#141414]"
                      key={entry.user_id}
                    >
                      <span className={`text-lg font-black ${index === 0 ? 'text-[#CCFF00]' : 'text-[#0A0A0A] dark:text-white'}`}>{index + 1}</span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[#0A0A0A] dark:text-white">{entry.nome}</p>
                      </div>
                      <span className="text-sm font-black text-[#CCFF00]">{entry.total_points} pts</span>
                    </article>
                  ))
                ) : (
                  <p className="text-sm text-zinc-600 dark:text-gray-400">Ainda nao ha ranking consolidado.</p>
                )}
              </div>
            </section>

            <section className="rounded-[28px] border border-[#E0E0E0] bg-white p-6 shadow-[0_20px_60px_rgba(0,0,0,0.08)] dark:border-[#2A2A2A] dark:bg-[#141414] dark:shadow-[0_20px_60px_rgba(0,0,0,0.28)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#FF007F]">Agenda</p>
                  <h2 className="mt-2 text-2xl font-black text-[#0A0A0A] dark:text-white">Proximos jogos</h2>
                </div>
                <a
                  className="inline-flex cursor-pointer items-center justify-center rounded-full border border-[#E0E0E0] px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[#0A0A0A] transition-all duration-150 hover:bg-[#2A2A2A] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CCFF00] active:scale-95 dark:border-[#2A2A2A] dark:text-white dark:hover:bg-[#2A2A2A]"
                  href="#jogos"
                >
                  Ver todos os jogos
                </a>
              </div>

              <div className="mt-5 space-y-3">
                {nextPendingMatches.slice(0, 3).length > 0 ? (
                  nextPendingMatches.slice(0, 3).map((match) => (
                    <article
                      className="rounded-[22px] border border-[#E0E0E0] bg-white px-4 py-4 dark:border-[#2A2A2A] dark:bg-[#141414]"
                      key={match.id}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-[0.18em] text-zinc-500 dark:text-gray-500">{match.round}</p>
                          <h3 className="mt-2 text-lg font-black text-[#0A0A0A] dark:text-white">
                            {match.home_team} x {match.away_team}
                          </h3>
                          <p className="mt-2 text-sm text-zinc-600 dark:text-gray-400">{formatMatchKickoff(match.match_time)}</p>
                        </div>
                        <span className="rounded-full border border-[#CCFF00]/20 bg-[#CCFF00]/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-[#CCFF00]">
                          Pendente
                        </span>
                      </div>
                    </article>
                  ))
                ) : (
                  <p className="text-sm text-zinc-600 dark:text-gray-400">Nao ha proximos jogos pendentes para exibir.</p>
                )}
              </div>
            </section>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
