import { useEffect, useMemo, useState } from 'react';
import { Button } from '../components/ui/Button';
import { FeedbackBanner } from '../components/ui/FeedbackBanner';
import { useAppData } from '../context/AppDataContext';
import { formatMatchKickoff, getFlagCode, normalizeDepartmentName } from '../lib/display';
import { upsertPrediction } from '../lib/matches';
import { supabase } from '../lib/supabaseClient';
import type { Sprint3MatchRecord, Sprint3PredictionRecord } from '../lib/types';

interface MatchDetailProps {
  matchId: string;
}

type EveryonePredictionRow = {
  userId: string;
  nome: string;
  departamento: string | null;
  homeScore: number | null;
  awayScore: number | null;
  points: number | null;
  hasPrediction: boolean;
};

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

  return <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#2A2A2A] text-base font-bold text-white">{fallback}</div>;
}

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function pointsBadge(points: number | null) {
  if (points === 25) {
    return {
      className: 'bg-[#CCFF00] text-black',
      label: 'CRAVADA! 🎯',
    };
  }

  if (points === 18) {
    return {
      className: 'bg-[#7DD3FC] text-[#082F49]',
      label: '18 pts',
    };
  }

  if (points === 15) {
    return {
      className: 'bg-[#4ADE80] text-[#052E16]',
      label: '15 pts',
    };
  }

  if (points === 12) {
    return {
      className: 'bg-[#FACC15] text-[#422006]',
      label: '12 pts',
    };
  }

  if (points === 10) {
    return {
      className: 'bg-[#E5E7EB] text-[#111827]',
      label: '10 pts',
    };
  }

  return {
    className: 'bg-[#FF007F]/20 text-[#FF66B2]',
    label: '0 pts',
  };
}

function liveHeadline(match: Sprint3MatchRecord) {
  if (match.status === 'ao_vivo') {
    const minute = Math.max(1, Math.min(120, Math.floor((Date.now() - new Date(match.match_time).getTime()) / 60000)));
    const halfLabel = minute > 45 ? '2º TEMPO' : '1º TEMPO';
    return `AO VIVO - ${halfLabel} ${minute}'`;
  }

  if (match.status === 'finalizado') {
    return 'ENCERRADO';
  }

  if (match.status === 'aguardando_resultado') {
    return 'AGUARDANDO RESULTADO';
  }

  return `PENDENTE - ${formatMatchKickoff(match.match_time)}`;
}

function stepScore(value: string, direction: -1 | 1) {
  const parsed = Number(value || '0');
  const next = Math.max(0, parsed + direction);
  return String(next);
}

function getMatchDeadline(matchTime: string) {
  const kickoff = new Date(matchTime).getTime();

  if (Number.isNaN(kickoff)) {
    return null;
  }

  return kickoff - 60 * 60 * 1000;
}

async function getEveryonePredictions(matchId: string) {
  const [{ data: predictionsData, error: predictionsError }, { data: usersData, error: usersError }] =
    await Promise.all([
      supabase
        .schema('cravou')
        .from('predictions')
        .select('home_score, away_score, points, user_id')
        .eq('match_id', matchId)
        .order('points', { ascending: false }),
      supabase.from('cravou_users').select('id, nome, departamento'),
    ]);

  if (predictionsError) {
    throw predictionsError;
  }

  if (usersError) {
    throw usersError;
  }

  const predictionMap = new Map<
    string,
    {
      home_score: number | null;
      away_score: number | null;
      points: number | null;
    }
  >();

  (((predictionsData as
    | Array<{
        user_id: string;
        home_score: number | null;
        away_score: number | null;
        points: number | null;
      }>
    | null) ?? [])).forEach((entry) => {
    predictionMap.set(entry.user_id, entry);
  });

  const users =
    ((usersData as Array<{ id: string; nome: string | null; departamento: string | null }> | null) ?? []).map((entry) => {
      const predictionEntry = predictionMap.get(entry.id);

      return {
        userId: entry.id,
        nome: entry.nome?.trim() || 'Participante',
        departamento: entry.departamento ?? null,
        homeScore: predictionEntry?.home_score ?? null,
        awayScore: predictionEntry?.away_score ?? null,
        points: predictionEntry?.points ?? null,
        hasPrediction: Boolean(predictionEntry),
      };
    });

  const withPrediction = users
    .filter((entry) => entry.hasPrediction)
    .sort((left, right) => {
      const leftPoints = left.points ?? -1;
      const rightPoints = right.points ?? -1;

      if (rightPoints !== leftPoints) {
        return rightPoints - leftPoints;
      }

      return left.nome.localeCompare(right.nome, 'pt-BR');
    });

  const withoutPrediction = users
    .filter((entry) => !entry.hasPrediction)
    .sort((left, right) => left.nome.localeCompare(right.nome, 'pt-BR'));

  return [...withPrediction, ...withoutPrediction];
}

function errorToMessage(error: unknown) {
  return error && typeof error === 'object' && 'message' in error
    ? String(error.message)
    : 'Nao foi possivel carregar os detalhes deste jogo.';
}

export default function MatchDetail({ matchId }: MatchDetailProps) {
  const {
    matches,
    predictions,
    isInitialLoading,
    errorMessage: appDataErrorMessage,
    refetchAll,
  } = useAppData();
  const [optimisticPrediction, setOptimisticPrediction] = useState<Sprint3PredictionRecord | null>(null);
  const [everyonePredictions, setEveryonePredictions] = useState<EveryonePredictionRow[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [homeScore, setHomeScore] = useState('0');
  const [awayScore, setAwayScore] = useState('0');
  const [saving, setSaving] = useState(false);
  const [detailErrorMessage, setDetailErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const match = useMemo(
    () => matches.find((item) => item.id === matchId) ?? null,
    [matchId, matches],
  );
  const contextPrediction = useMemo(
    () => predictions.find((item) => item.match_id === matchId) ?? null,
    [matchId, predictions],
  );
  const prediction =
    optimisticPrediction?.match_id === matchId
      ? optimisticPrediction
      : contextPrediction;

  useEffect(() => {
    setOptimisticPrediction(null);
    setIsEditing(false);
    setDetailErrorMessage(null);
    setSuccessMessage(null);
  }, [matchId]);

  useEffect(() => {
    if (!optimisticPrediction || optimisticPrediction.match_id !== matchId || !contextPrediction) {
      return;
    }

    if (
      contextPrediction.home_score === optimisticPrediction.home_score &&
      contextPrediction.away_score === optimisticPrediction.away_score
    ) {
      setOptimisticPrediction(null);
    }
  }, [contextPrediction, matchId, optimisticPrediction]);

  useEffect(() => {
    if (isEditing) {
      return;
    }

    setHomeScore(prediction ? String(prediction.home_score) : '0');
    setAwayScore(prediction ? String(prediction.away_score) : '0');
  }, [isEditing, prediction]);

  useEffect(() => {
    let isCurrent = true;

    setEveryonePredictions([]);

    if (match?.status !== 'finalizado') {
      return () => {
        isCurrent = false;
      };
    }

    void getEveryonePredictions(matchId)
      .then((rows) => {
        if (isCurrent) {
          setEveryonePredictions(rows);
        }
      })
      .catch((error) => {
        if (isCurrent) {
          setDetailErrorMessage(errorToMessage(error));
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [match?.status, matchId]);

  const now = Date.now();
  const matchDeadline = match ? getMatchDeadline(match.match_time) : null;
  const bettingClosed = !match || match.status !== 'pendente' || matchDeadline == null || now >= matchDeadline;
  const canEdit = !bettingClosed;
  const potentialPoints = useMemo(() => {
    if (!match || !prediction) {
      return null;
    }

    if (match.status === 'pendente') {
      return 10;
    }

    if (match.home_score == null || match.away_score == null) {
      return null;
    }

    if (prediction.home_score === match.home_score && prediction.away_score === match.away_score) {
      return 10;
    }

    const predictionOutcome = Math.sign(prediction.home_score - prediction.away_score);
    const realOutcome = Math.sign(match.home_score - match.away_score);
    return predictionOutcome === realOutcome ? 5 : 0;
  }, [match, prediction]);

  const savePrediction = async () => {
    if (!match || bettingClosed) {
      setDetailErrorMessage('Esse jogo nao aceita novos palpites agora.');
      return;
    }

    setSaving(true);
    setDetailErrorMessage(null);
    setSuccessMessage(null);

    try {
      const nextPrediction = await upsertPrediction(match.id, Number(homeScore), Number(awayScore));
      setOptimisticPrediction(nextPrediction);
      setIsEditing(false);
      setSuccessMessage('Palpite salvo com sucesso.');
      void refetchAll();
    } catch (error) {
      const message =
        error && typeof error === 'object' && 'message' in error
          ? String(error.message)
          : 'Nao foi possivel salvar seu palpite.';
      setDetailErrorMessage(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] px-4 pb-28 pt-6 text-[#0A0A0A] dark:bg-[#0A0A0A] dark:text-white md:px-8 md:pb-12">
      <div className="mx-auto max-w-5xl space-y-5">
        <a className="inline-flex items-center text-sm text-zinc-500 transition hover:text-[#0A0A0A] dark:text-gray-400 dark:hover:text-white" href="#jogos">
          ← Voltar
        </a>

        {appDataErrorMessage ? <FeedbackBanner message={appDataErrorMessage} tone="error" /> : null}
        {detailErrorMessage ? <FeedbackBanner message={detailErrorMessage} tone="error" /> : null}
        {successMessage ? <FeedbackBanner message={successMessage} tone="success" /> : null}

        {isInitialLoading ? (
          <div className="rounded-[16px] border border-[#E0E0E0] bg-white p-10 text-center text-sm text-zinc-600 dark:border-[#2A2A2A] dark:bg-[#141414] dark:text-gray-300">
            Carregando jogo...
          </div>
        ) : !match ? (
          <div className="rounded-[16px] border border-[#E0E0E0] bg-white p-10 text-center text-sm text-zinc-600 dark:border-[#2A2A2A] dark:bg-[#141414] dark:text-gray-300">
            Jogo nao encontrado.
          </div>
        ) : (
          <>
            <section className="relative overflow-hidden rounded-[20px] border border-[#E0E0E0] bg-white p-6 dark:border-[#2A2A2A] dark:bg-[#141414]">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(12,53,26,0.42),transparent_35%),radial-gradient(circle_at_80%_30%,rgba(42,42,42,0.42),transparent_36%)] opacity-30 blur-3xl" />
              <div className="relative">
                <div className="flex justify-center">
                  <span className="rounded-full border border-white/20 bg-black/50 px-4 py-2 text-sm font-semibold text-white">
                    {liveHeadline(match)}
                  </span>
                </div>

                <div className="mt-8 grid items-center gap-6 md:grid-cols-[1fr_auto_1fr]">
                  <div className="flex flex-col items-center text-center">
                    {renderFlag(match.home_flag, initials(match.home_team))}
                    <p className="mt-4 text-2xl font-bold uppercase tracking-wide text-[#0A0A0A] dark:text-white">{match.home_team}</p>
                  </div>

                  <div className="text-center">
                    <p className={`text-7xl font-extrabold ${match.status === 'finalizado' ? 'text-white' : 'text-[#CCFF00]'}`}>
                      {match.home_score ?? 0} x {match.away_score ?? 0}
                    </p>
                    <p className="mt-3 text-sm text-gray-400">{match.round}</p>
                  </div>

                  <div className="flex flex-col items-center text-center">
                    {renderFlag(match.away_flag, initials(match.away_team))}
                    <p className="mt-4 text-2xl font-bold uppercase tracking-wide text-[#0A0A0A] dark:text-white">{match.away_team}</p>
                  </div>
                </div>
              </div>
            </section>

            {match.status === 'finalizado' ? (
              <section className="rounded-[20px] border border-[#2A2A2A] bg-[#141414] p-5 text-white">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#CCFF00]">Resultados</p>
                    <h3 className="mt-2 text-2xl font-black tracking-tight">👥 Palpites de Todos</h3>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-gray-300">
                    {everyonePredictions.length} participantes
                  </span>
                </div>

                {everyonePredictions.length > 0 ? (
                  <div className="mt-5">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      {everyonePredictions.map((entry, index) => {
                        const shouldShowSeparator =
                          index > 0 && !entry.hasPrediction && everyonePredictions[index - 1]?.hasPrediction;
                        const badge = pointsBadge(entry.points);
                        const departmentLabel = normalizeDepartmentName(entry.departamento) ?? 'Sem departamento';

                        return (
                          <div key={entry.userId} className={shouldShowSeparator ? 'md:col-span-2' : undefined}>
                            {shouldShowSeparator ? (
                              <div className="mb-3 rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-4 py-3 text-xs font-bold uppercase tracking-[0.22em] text-gray-400">
                                Participantes sem palpite
                              </div>
                            ) : null}

                            <article className="flex items-center justify-between gap-3 rounded-[18px] border border-white/8 bg-white/[0.04] px-4 py-3">
                              <div className="flex min-w-0 items-center gap-3">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#2A2A2A] bg-[#222222] text-sm font-black text-white">
                                  {initials(entry.nome)}
                                </div>

                                <div className="min-w-0">
                                  <p className="truncate text-sm font-bold text-white">{entry.nome}</p>
                                  <p className="truncate text-xs uppercase tracking-[0.18em] text-gray-500">{departmentLabel}</p>
                                </div>
                              </div>

                              <div className="text-right">
                                {entry.hasPrediction ? (
                                  <>
                                    <p className="text-sm font-semibold text-white">
                                      {entry.homeScore} x {entry.awayScore}
                                    </p>
                                    <span className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ${badge.className}`}>
                                      {badge.label}
                                    </span>
                                  </>
                                ) : (
                                  <span className="inline-flex rounded-full border border-[#2A2A2A] bg-[#1C1C1C] px-3 py-1 text-xs font-semibold text-gray-400">
                                    Não apostou
                                  </span>
                                )}
                              </div>
                            </article>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <p className="mt-5 text-sm text-gray-400">Nenhum participante encontrado para este jogo.</p>
                )}
              </section>
            ) : null}

            <section className="rounded-2xl bg-[#FAFAFA] p-4 dark:bg-[#1C1C1C]">
              {prediction && canEdit && !isEditing ? (
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-[#CCFF00]">Seu palpite</p>
                      <p className="mt-2 text-2xl font-bold text-white">
                        {prediction.home_score} x {prediction.away_score}
                      </p>
                    </div>
                    <span className="rounded-full bg-[#2A2A2A] px-2 py-1 text-xs text-gray-300">
                      Potencial: {potentialPoints ?? '--'} pts
                    </span>
                  </div>
                  <Button
                    className="bg-[#CCFF00] text-black shadow-none hover:bg-[#CCFF00]/90"
                    onClick={() => {
                      setHomeScore(String(prediction.home_score));
                      setAwayScore(String(prediction.away_score));
                      setIsEditing(true);
                    }}
                    type="button"
                  >
                    Editar
                  </Button>
                </div>
              ) : canEdit ? (
                <div className="space-y-4">
                  <p className="text-xs uppercase tracking-wide text-[#CCFF00]">Seu palpite</p>
                  <div className="grid gap-4 sm:grid-cols-[1fr_auto_1fr]">
                    <div className="rounded-2xl bg-[#141414] p-4">
                      <p className="text-xs uppercase tracking-wide text-gray-500">{match.home_team}</p>
                      <div className="mt-3 flex items-center justify-between">
                        <button
                          className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2A2A2A] text-xl text-white"
                          onClick={() => setHomeScore((current) => stepScore(current, -1))}
                          type="button"
                        >
                          -
                        </button>
                        <span className="text-3xl font-extrabold text-white">{homeScore}</span>
                        <button
                          className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2A2A2A] text-xl text-white"
                          onClick={() => setHomeScore((current) => stepScore(current, 1))}
                          type="button"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <div className="hidden items-center justify-center text-3xl font-bold text-gray-500 sm:flex">x</div>
                    <div className="rounded-2xl bg-[#141414] p-4">
                      <p className="text-xs uppercase tracking-wide text-gray-500">{match.away_team}</p>
                      <div className="mt-3 flex items-center justify-between">
                        <button
                          className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2A2A2A] text-xl text-white"
                          onClick={() => setAwayScore((current) => stepScore(current, -1))}
                          type="button"
                        >
                          -
                        </button>
                        <span className="text-3xl font-extrabold text-white">{awayScore}</span>
                        <button
                          className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2A2A2A] text-xl text-white"
                          onClick={() => setAwayScore((current) => stepScore(current, 1))}
                          type="button"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                  <Button
                    className="bg-[#CCFF00] text-black shadow-none hover:bg-[#CCFF00]/90"
                    disabled={saving}
                    onClick={() => void savePrediction()}
                    type="button"
                  >
                    {saving ? 'Confirmando...' : 'Confirmar'}
                  </Button>
                </div>
              ) : prediction ? (
                <div className="space-y-4">
                  <p className="text-xs uppercase tracking-wide text-[#CCFF00]">Seu palpite</p>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-2xl font-bold text-white">
                      {prediction.home_score} x {prediction.away_score}
                    </p>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        (prediction.points ?? 0) > 0 ? 'bg-[#143514] text-[#CCFF00]' : 'bg-[#2A2A2A] text-gray-300'
                      }`}
                    >
                      {(prediction.points ?? 0) > 0 ? `${prediction.points} pts` : '0 pts'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-wide text-[#CCFF00]">Seu palpite</p>
                  <p className="text-sm text-gray-400">
                    {bettingClosed
                      ? 'A janela para palpites deste jogo foi encerrada.'
                      : 'Voce nao registrou palpite para este jogo.'}
                  </p>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
