import { useCallback, useEffect, useMemo, useState } from 'react';
import { FeedbackBanner } from '../components/ui/FeedbackBanner';
import { useAuth } from '../context/AuthContext';
import { getLeaderboard, getMatches, getMyPredictions, getRecentPredictionActivity } from '../lib/matches';
import type {
  Sprint3LeaderboardEntry,
  Sprint3MatchRecord,
  Sprint3PredictionActivity,
  Sprint3PredictionWithMatchRecord,
} from '../lib/types';

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function formatRelativeTime(value: string) {
  const diffMs = Date.now() - new Date(value).getTime();
  const diffMinutes = Math.max(1, Math.floor(diffMs / 60000));

  if (diffMinutes < 60) {
    return `${diffMinutes} min`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h`;
  }

  return `${Math.floor(diffHours / 24)}d`;
}

function formatCountdown(value: string) {
  const diffMs = new Date(value).getTime() - Date.now();

  if (diffMs <= 0) {
    return 'Comeca em instantes';
  }

  const totalMinutes = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `${days}d ${hours}h`;
  }

  return `${hours}h ${minutes}min`;
}

function estimatedMinute(matchTime: string) {
  const diffMinutes = Math.floor((Date.now() - new Date(matchTime).getTime()) / 60000);
  const boundedMinutes = Math.min(130, Math.max(1, diffMinutes));
  return `${boundedMinutes}'`;
}

function activityIcon(activity: Sprint3PredictionActivity) {
  if (activity.home_score === activity.away_score) {
    return '=';
  }

  return activity.home_score > activity.away_score ? 'H' : 'A';
}

export default function Home() {
  const { user } = useAuth();
  const [matches, setMatches] = useState<Sprint3MatchRecord[]>([]);
  const [predictions, setPredictions] = useState<Sprint3PredictionWithMatchRecord[]>([]);
  const [leaderboard, setLeaderboard] = useState<Sprint3LeaderboardEntry[]>([]);
  const [activity, setActivity] = useState<Sprint3PredictionActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const [matchRows, predictionRows, leaderboardRows, activityRows] = await Promise.all([
        getMatches(),
        getMyPredictions(),
        getLeaderboard(),
        getRecentPredictionActivity(4),
      ]);

      setMatches(matchRows);
      setPredictions(predictionRows);
      setLeaderboard(leaderboardRows);
      setActivity(activityRows);
    } catch (error) {
      const message =
        error && typeof error === 'object' && 'message' in error
          ? String(error.message)
          : 'Nao foi possivel carregar o dashboard agora.';
      setErrorMessage(message);
      setMatches([]);
      setPredictions([]);
      setLeaderboard([]);
      setActivity([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const safeMatches = useMemo(
    () => (matches ?? []).filter((match): match is Sprint3MatchRecord => Boolean(match)),
    [matches],
  );
  const safePredictions = useMemo(
    () =>
      (predictions ?? []).filter(
        (prediction): prediction is Sprint3PredictionWithMatchRecord => Boolean(prediction?.matches),
      ),
    [predictions],
  );

  const liveMatch = useMemo(() => safeMatches.find((match) => match?.status === 'ao_vivo') ?? null, [safeMatches]);
  const nextMatch = useMemo(
    () =>
      safeMatches.find((match) => match?.status === 'pendente' && new Date(match.match_time).getTime() > Date.now()) ??
      null,
    [safeMatches],
  );

  const myStats = useMemo(() => {
    const totalPoints = safePredictions.reduce((sum, prediction) => sum + (prediction.points ?? 0), 0);
    const resolvedPredictions = safePredictions.filter((prediction) => prediction.matches?.status === 'finalizado');
    const hits = resolvedPredictions.filter((prediction) => (prediction.points ?? 0) > 0).length;
    const exactScores = resolvedPredictions.filter((prediction) => prediction.points === 10).length;
    const position = leaderboard.findIndex((entry) => entry.user_id === user?.id);
    const successRate = resolvedPredictions.length > 0 ? Math.round((hits / resolvedPredictions.length) * 100) : null;

    return {
      totalPoints,
      position: position >= 0 ? position + 1 : null,
      hits,
      exactScores,
      successRate,
    };
  }, [leaderboard, safePredictions, user?.id]);

  const quickRanking = useMemo(() => leaderboard.slice(0, 3), [leaderboard]);

  return (
    <div className="min-h-screen bg-[#F5F5F5] px-4 pb-28 pt-6 text-[#0A0A0A] dark:bg-[#0A0A0A] dark:text-white md:px-8 md:pb-12">
      <div className="mx-auto max-w-6xl space-y-4">
        {errorMessage ? <FeedbackBanner message={errorMessage} tone="error" /> : null}

        {loading ? (
          <div className="rounded-[16px] border border-[#E0E0E0] bg-white p-10 text-center text-sm text-zinc-600 dark:border-[#2A2A2A] dark:bg-[#141414] dark:text-gray-300">
            Carregando dashboard...
          </div>
        ) : (
          <>
            <section className="rounded-[16px] border border-[#E0E0E0] bg-white p-5 dark:border-[#2A2A2A] dark:bg-[#141414]">
              <p className="text-xs font-bold uppercase tracking-wide text-zinc-500 dark:text-gray-500">Status da rodada</p>

              {liveMatch ? (
                <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#EFEFEF] text-2xl font-bold text-[#0A0A0A] dark:bg-[#2A2A2A] dark:text-white">
                      {initials(liveMatch.home_team)}
                    </div>
                    <div>
                      <p className="text-sm text-zinc-500 dark:text-gray-400">{liveMatch.round}</p>
                      <h1 className="text-2xl font-bold uppercase tracking-wide text-[#0A0A0A] dark:text-white">
                        {liveMatch.home_team} x {liveMatch.away_team}
                      </h1>
                    </div>
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#EFEFEF] text-2xl font-bold text-[#0A0A0A] dark:bg-[#2A2A2A] dark:text-white">
                      {initials(liveMatch.away_team)}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <p className="text-6xl font-extrabold text-[#CCFF00]">
                      {liveMatch.home_score ?? 0} x {liveMatch.away_score ?? 0}
                    </p>
                    <div className="text-right">
                      <span className="inline-flex items-center rounded-full bg-red-600 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
                        <span className="mr-2 inline-block h-2 w-2 animate-pulse rounded-full bg-white" />
                        AO VIVO
                      </span>
                      <p className="mt-2 text-sm text-zinc-500 dark:text-gray-400">{estimatedMinute(liveMatch.match_time)}</p>
                    </div>
                  </div>
                </div>
              ) : nextMatch ? (
                <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="text-sm text-zinc-500 dark:text-gray-400">{nextMatch.round}</p>
                    <h1 className="mt-2 text-3xl font-bold uppercase tracking-wide text-[#0A0A0A] dark:text-white">
                      {nextMatch.home_team} x {nextMatch.away_team}
                    </h1>
                    <p className="mt-2 text-sm text-zinc-500 dark:text-gray-400">{new Date(nextMatch.match_time).toLocaleString('pt-BR')}</p>
                  </div>
                  <div className="rounded-[16px] border border-[#E0E0E0] bg-[#FAFAFA] px-5 py-4 dark:border-[#2A2A2A] dark:bg-[#1C1C1C]">
                    <p className="text-xs font-bold uppercase tracking-wide text-zinc-500 dark:text-gray-500">Proximo jogo</p>
                    <p className="mt-2 text-3xl font-extrabold text-[#CCFF00]">{formatCountdown(nextMatch.match_time)}</p>
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-[16px] border border-dashed border-[#E0E0E0] bg-[#FAFAFA] p-5 text-sm text-zinc-500 dark:border-[#2A2A2A] dark:bg-[#111111] dark:text-gray-400">
                  Nenhum jogo ao vivo ou agendado foi encontrado.
                </div>
              )}
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
              <article className="rounded-[16px] border border-[#E0E0E0] bg-white p-5 dark:border-[#2A2A2A] dark:bg-[#141414]">
                <p className="text-xs font-bold uppercase tracking-wide text-zinc-500 dark:text-gray-500">Estatisticas</p>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-[16px] border border-[#E0E0E0] bg-[#FAFAFA] p-4 dark:border-[#2A2A2A] dark:bg-[#101010]">
                    <p className="text-xs text-zinc-500 dark:text-gray-400">Pontos</p>
                    <p className="mt-2 text-2xl font-bold text-[#CCFF00]">{myStats.totalPoints}</p>
                  </div>
                  <div className="rounded-[16px] border border-[#E0E0E0] bg-[#FAFAFA] p-4 dark:border-[#2A2A2A] dark:bg-[#101010]">
                    <p className="text-xs text-zinc-500 dark:text-gray-400">Posicao</p>
                    <p className="mt-2 text-2xl font-bold text-[#0A0A0A] dark:text-white">{myStats.position ?? '-'}</p>
                  </div>
                  <div className="rounded-[16px] border border-[#E0E0E0] bg-[#FAFAFA] p-4 dark:border-[#2A2A2A] dark:bg-[#101010]">
                    <p className="text-xs text-zinc-500 dark:text-gray-400">Acertos</p>
                    <p className="mt-2 text-xl font-bold text-[#0A0A0A] dark:text-white">{myStats.hits}</p>
                  </div>
                  <div className="rounded-[16px] border border-[#E0E0E0] bg-[#FAFAFA] p-4 dark:border-[#2A2A2A] dark:bg-[#101010]">
                    <p className="text-xs text-zinc-500 dark:text-gray-400">Aproveitamento</p>
                    <p className="mt-2 text-xl font-bold text-[#0A0A0A] dark:text-white">
                      {myStats.successRate == null ? '--' : `${myStats.successRate}%`}
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-xs text-zinc-500 dark:text-gray-500">Placares exatos acumulados: {myStats.exactScores}</p>
              </article>

              <article className="rounded-[16px] border border-[#E0E0E0] bg-white p-5 dark:border-[#2A2A2A] dark:bg-[#141414]">
                <p className="text-xs font-bold uppercase tracking-wide text-zinc-500 dark:text-gray-500">Ranking rapido</p>
                <div className="mt-4 space-y-3">
                  {quickRanking.length > 0 ? (
                    quickRanking.map((entry, index) => (
                      <div className="flex items-center gap-3" key={entry.user_id}>
                        <span className="w-4 text-sm text-zinc-500 dark:text-gray-500">{index + 1}</span>
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EFEFEF] text-xs font-bold text-[#0A0A0A] dark:bg-[#2A2A2A] dark:text-white">
                          {initials(entry.nome)}
                        </div>
                        <span className="text-sm text-[#0A0A0A] dark:text-white">{entry.nome}</span>
                        <span className="ml-auto text-sm text-[#CCFF00]">{entry.total_points} pts</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-zinc-500 dark:text-gray-400">Ainda nao ha ranking disponivel.</p>
                  )}
                </div>
                <a
                  className="mt-3 inline-flex w-full items-center justify-center rounded-full border border-[#CCFF00] px-4 py-2 text-sm font-bold uppercase tracking-wide text-[#CCFF00]"
                  href="#ranking"
                >
                  Ver tudo
                </a>
              </article>
            </section>

            <section className="rounded-[16px] border border-[#E0E0E0] bg-white p-5 dark:border-[#2A2A2A] dark:bg-[#141414]">
              <p className="text-xs font-bold uppercase tracking-wide text-zinc-500 dark:text-gray-500">Ultimas movimentacoes</p>
              <div className="mt-4 space-y-3">
                {activity.length > 0 ? (
                  activity.map((item) => (
                    <div className="flex items-center gap-3" key={item.prediction_id}>
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1C1C1C] text-sm font-bold text-[#FF007F]">
                        {activityIcon(item)}
                      </div>
                      <div className="min-w-0 flex-1 text-sm text-zinc-600 dark:text-gray-300">
                        <span className="font-bold text-[#0A0A0A] dark:text-white">{item.user_name}</span>{' '}
                        registrou palpite em <span className="text-[#CCFF00]">{item.match_label}</span>
                      </div>
                      <span className="ml-auto text-xs text-zinc-500 dark:text-gray-500">{formatRelativeTime(item.updated_at)}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-zinc-500 dark:text-gray-400">Ainda nao houve movimentacoes recentes de palpites.</p>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
