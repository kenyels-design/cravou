import { useCallback, useEffect, useMemo, useState } from 'react';
import { FeedbackBanner } from '../components/ui/FeedbackBanner';
import { useAuth } from '../context/AuthContext';
import { formatMatchKickoff } from '../lib/display';
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
    text: `${item.user_name} apostou ${item.home_score} x ${item.away_score} em ${item.match_label}`,
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

  const nextMatch = nextPendingMatches[0] ?? null;

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
    <div className="min-h-screen bg-[#0A0A0A] px-4 pb-28 pt-6 text-white md:px-8 md:pb-12">
      <div className="mx-auto max-w-6xl space-y-5">
        {errorMessage ? <FeedbackBanner message={errorMessage} tone="error" /> : null}

        {loading ? (
          <div className="rounded-[28px] border border-[#2A2A2A] bg-[#141414] p-10 text-center text-sm text-gray-300">
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
            <section className="rounded-[28px] border border-[#2A2A2A] bg-[#141414] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.28)]">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#CCFF00]">Resumo pessoal</p>
              <h1 className="mt-4 text-3xl font-black tracking-tight text-white">
                Ola, {profile?.nome ?? user?.email?.split('@')[0] ?? 'Camerite'}!
              </h1>
              <p className="mt-2 text-sm text-gray-400">
                Seu painel rapido para acompanhar pontuacao, proximos palpites e sua posicao na disputa.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <article className="rounded-[22px] border border-[#2A2A2A] bg-[#101010] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-gray-500">Pontuacao total</p>
                  <p className="mt-3 text-3xl font-black text-[#CCFF00]">{myStats.totalPoints}</p>
                </article>
                <article className="rounded-[22px] border border-[#2A2A2A] bg-[#101010] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-gray-500">Posicao no ranking</p>
                  <p className="mt-3 text-3xl font-black text-white">
                    {myStats.rankingPosition ? `${myStats.rankingPosition}o` : '--'}
                  </p>
                </article>
                <article className="rounded-[22px] border border-[#2A2A2A] bg-[#101010] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-gray-500">Palpites feitos</p>
                  <p className="mt-3 text-3xl font-black text-white">{myStats.totalPredictions}</p>
                </article>
              </div>

              <div className="mt-5 rounded-[24px] border border-[#2A2A2A] bg-[radial-gradient(circle_at_top_left,_rgba(204,255,0,0.12),_transparent_35%),#101010] p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-gray-500">Proximo jogo + deadline</p>
                {nextMatch ? (
                  <>
                    <h2 className="mt-3 text-2xl font-black text-white">
                      {nextMatch.home_team} x {nextMatch.away_team}
                    </h2>
                    <p className="mt-2 text-sm text-gray-400">{formatMatchKickoff(nextMatch.match_time)}</p>
                    <p className="mt-4 inline-flex rounded-full border border-[#FF007F]/30 bg-[#FF007F]/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-[#FF66B2]">
                      {deadlineLabel(nextMatch.match_time)}
                    </p>
                  </>
                ) : (
                  <p className="mt-3 text-sm text-gray-400">Nenhum jogo pendente encontrado no momento.</p>
                )}
              </div>
            </section>

            <section className="rounded-[28px] border border-[#2A2A2A] bg-[#141414] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.28)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#FF007F]">Movimentacoes</p>
                  <h2 className="mt-2 text-2xl font-black text-white">Ultimas atividades</h2>
                </div>
                <span className="rounded-full border border-[#2A2A2A] bg-[#101010] px-3 py-1 text-xs font-semibold text-gray-400">
                  {feedItems.length} itens
                </span>
              </div>

              <div className="mt-5 space-y-3">
                {feedItems.length > 0 ? (
                  feedItems.map((item) => (
                    <article
                      className="grid grid-cols-[40px_minmax(0,1fr)_auto] items-start gap-3 rounded-[22px] border border-[#2A2A2A] bg-[#101010] px-4 py-3"
                      key={item.id}
                    >
                      <div className={`flex h-10 w-10 items-center justify-center rounded-full bg-[#141414] text-sm font-black ${item.accent}`}>
                        {item.icon}
                      </div>
                      <p className="pt-1 text-sm leading-6 text-gray-200">{item.text}</p>
                      <span className="pt-1 text-xs text-gray-500">{relativeTime(item.timestamp)}</span>
                    </article>
                  ))
                ) : (
                  <p className="text-sm text-gray-400">Ainda nao ha atividades recentes para mostrar.</p>
                )}
              </div>
            </section>

            <section className="rounded-[28px] border border-[#2A2A2A] bg-[#141414] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.28)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#CCFF00]">Ranking</p>
                  <h2 className="mt-2 text-2xl font-black text-white">Top 3 da rodada</h2>
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
                      className="grid grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 rounded-[22px] border border-[#2A2A2A] bg-[#101010] px-4 py-3"
                      key={entry.user_id}
                    >
                      <span className={`text-lg font-black ${index === 0 ? 'text-[#CCFF00]' : 'text-white'}`}>{index + 1}</span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">{entry.nome}</p>
                      </div>
                      <span className="text-sm font-black text-[#CCFF00]">{entry.total_points} pts</span>
                    </article>
                  ))
                ) : (
                  <p className="text-sm text-gray-400">Ainda nao ha ranking consolidado.</p>
                )}
              </div>
            </section>

            <section className="rounded-[28px] border border-[#2A2A2A] bg-[#141414] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.28)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#FF007F]">Agenda</p>
                  <h2 className="mt-2 text-2xl font-black text-white">Proximos jogos</h2>
                </div>
                <a
                  className="inline-flex cursor-pointer items-center justify-center rounded-full border border-[#2A2A2A] px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-white transition-all duration-150 hover:bg-[#2A2A2A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CCFF00] active:scale-95"
                  href="#jogos"
                >
                  Ver todos os jogos
                </a>
              </div>

              <div className="mt-5 space-y-3">
                {nextPendingMatches.slice(0, 3).length > 0 ? (
                  nextPendingMatches.slice(0, 3).map((match) => (
                    <article
                      className="rounded-[22px] border border-[#2A2A2A] bg-[#101010] px-4 py-4"
                      key={match.id}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-[0.18em] text-gray-500">{match.round}</p>
                          <h3 className="mt-2 text-lg font-black text-white">
                            {match.home_team} x {match.away_team}
                          </h3>
                          <p className="mt-2 text-sm text-gray-400">{formatMatchKickoff(match.match_time)}</p>
                        </div>
                        <span className="rounded-full border border-[#CCFF00]/20 bg-[#CCFF00]/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-[#CCFF00]">
                          Pendente
                        </span>
                      </div>
                    </article>
                  ))
                ) : (
                  <p className="text-sm text-gray-400">Nao ha proximos jogos pendentes para exibir.</p>
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
