import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '../components/ui/Button';
import { FeedbackBanner } from '../components/ui/FeedbackBanner';
import { useAuth } from '../context/AuthContext';
import { formatMatchKickoff, getFlagCode } from '../lib/display';
import { getMatches, getMyPredictions, upsertPrediction } from '../lib/matches';
import type { Sprint3MatchRecord, Sprint3PredictionRecord } from '../lib/types';

interface MatchDetailProps {
  matchId: string;
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

export default function MatchDetail({ matchId }: MatchDetailProps) {
  const { user } = useAuth();
  const [match, setMatch] = useState<Sprint3MatchRecord | null>(null);
  const [prediction, setPrediction] = useState<Sprint3PredictionRecord | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [homeScore, setHomeScore] = useState('0');
  const [awayScore, setAwayScore] = useState('0');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!user) {
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const [matchRows, predictionRows] = await Promise.all([getMatches(), getMyPredictions()]);
      const foundMatch = matchRows.find((item) => item.id === matchId) ?? null;
      const foundPrediction = predictionRows.find((item) => item.match_id === matchId) ?? null;

      setMatch(foundMatch);
      setPrediction(foundPrediction);
      setIsEditing(false);
      setHomeScore(foundPrediction ? String(foundPrediction.home_score) : '0');
      setAwayScore(foundPrediction ? String(foundPrediction.away_score) : '0');
    } catch (error) {
      const message =
        error && typeof error === 'object' && 'message' in error
          ? String(error.message)
          : 'Nao foi possivel carregar os detalhes deste jogo.';
      setErrorMessage(message);
      setMatch(null);
      setPrediction(null);
    } finally {
      setLoading(false);
    }
  }, [matchId, user]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const canEdit = match?.status === 'pendente';
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
    if (!match || match.status !== 'pendente') {
      setErrorMessage('Esse jogo nao aceita novos palpites agora.');
      return;
    }

    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const nextPrediction = await upsertPrediction(match.id, Number(homeScore), Number(awayScore));
      setPrediction(nextPrediction);
      setIsEditing(false);
      setSuccessMessage('Palpite salvo com sucesso.');
    } catch (error) {
      const message =
        error && typeof error === 'object' && 'message' in error
          ? String(error.message)
          : 'Nao foi possivel salvar seu palpite.';
      setErrorMessage(message);
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

        {errorMessage ? <FeedbackBanner message={errorMessage} tone="error" /> : null}
        {successMessage ? <FeedbackBanner message={successMessage} tone="success" /> : null}

        {loading ? (
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
                  <p className="text-sm text-gray-400">Voce nao registrou palpite para este jogo.</p>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
