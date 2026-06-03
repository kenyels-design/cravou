import { useEffect, useMemo, useState } from 'react';
import { formatMatchKickoff, getFlagCode } from '../lib/display';
import { upsertPrediction } from '../lib/matches';
import type { Sprint3MatchRecord, Sprint3PredictionRecord } from '../lib/types';

interface QuickBetModeProps {
  matches: Sprint3MatchRecord[];
  onClose: () => void;
  onPredictionSaved: (prediction: Sprint3PredictionRecord) => void;
}

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function renderFlag(flag: string | null, fallback: string) {
  const code = getFlagCode(flag);

  if (code) {
    return (
      <span className="flex h-16 w-16 items-center justify-center">
        <span
          aria-hidden="true"
          className={`fi fi-${code} rounded-full`}
          style={{ width: '100%', height: '100%', display: 'inline-block' }}
        />
      </span>
    );
  }

  return (
    <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#2A2A2A] text-lg font-bold text-white">
      {fallback}
    </span>
  );
}

export default function QuickBetMode({ matches, onClose, onPredictionSaved }: QuickBetModeProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [homeScore, setHomeScore] = useState('0');
  const [awayScore, setAwayScore] = useState('0');
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savedCount, setSavedCount] = useState(0);

  useEffect(() => {
    setCurrentIndex(0);
    setHomeScore('0');
    setAwayScore('0');
    setSaving(false);
    setErrorMessage(null);
    setSavedCount(0);
  }, [matches]);

  const safeMatches = useMemo(
    () => (matches ?? []).filter((match): match is Sprint3MatchRecord => Boolean(match)),
    [matches],
  );
  const totalMatches = safeMatches.length;
  const currentMatch = safeMatches[currentIndex] ?? null;
  const isComplete = currentIndex >= totalMatches;
  const progressLabel = useMemo(() => {
    if (totalMatches === 0) {
      return '0 de 0 pendentes';
    }

    const currentStep = Math.min(currentIndex + 1, totalMatches);
    return `${currentStep} de ${totalMatches} pendentes`;
  }, [currentIndex, totalMatches]);

  const moveNext = () => {
    setCurrentIndex((current) => current + 1);
    setHomeScore('0');
    setAwayScore('0');
    setErrorMessage(null);
  };

  const handleSkip = () => {
    if (saving || isComplete) {
      return;
    }

    moveNext();
  };

  const handleSave = async () => {
    if (!currentMatch) {
      return;
    }

    if (homeScore.trim() === '' || awayScore.trim() === '') {
      setErrorMessage('Informe os dois placares antes de continuar.');
      return;
    }

    setSaving(true);
    setErrorMessage(null);

    try {
      const prediction = await upsertPrediction(currentMatch.id, Number(homeScore), Number(awayScore));
      onPredictionSaved(prediction);
      setSavedCount((current) => current + 1);
      moveNext();
    } catch (error) {
      const message =
        error && typeof error === 'object' && 'message' in error
          ? String(error.message)
          : 'Nao foi possivel salvar este palpite.';
      setErrorMessage(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-[#F5F5F5] text-[#0A0A0A] dark:bg-[#0A0A0A] dark:text-white">
      <div className="mx-auto flex h-screen w-full max-w-4xl flex-col px-4 pb-4 pt-4 md:px-8 md:pb-8 md:pt-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[#FF007F]">Modo Rapido</p>
            <p className="mt-2 text-sm text-gray-400">{progressLabel}</p>
          </div>
          <button
            aria-label="Fechar modo rapido"
            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-[#E0E0E0] bg-white text-xl text-[#0A0A0A] transition-all duration-150 hover:bg-[#2A2A2A] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CCFF00] active:scale-95 dark:border-[#2A2A2A] dark:bg-[#141414] dark:text-white dark:hover:bg-[#1C1C1C]"
            onClick={onClose}
            type="button"
          >
            X
          </button>
        </div>

        <div className="mt-4 flex min-h-0 flex-1">
          {isComplete ? (
            <div className="flex h-full w-full items-center justify-center">
              <div className="w-full max-w-2xl rounded-[24px] border border-[#E0E0E0] bg-white p-6 text-center md:p-8 dark:border-[#2A2A2A] dark:bg-[#141414]">
                <p className="text-xs font-bold uppercase tracking-wide text-[#FF007F]">Concluido</p>
                <h2 className="mt-4 text-2xl font-bold uppercase tracking-wide text-[#0A0A0A] md:text-3xl dark:text-white">Tudo certo por aqui</h2>
                <p className="mt-4 text-base text-zinc-600 md:text-lg dark:text-gray-300">{savedCount} palpites salvos no modo rapido.</p>
                <button
                  className="mt-8 inline-flex min-h-12 cursor-pointer items-center justify-center rounded-full bg-[#CCFF00] px-6 py-3 text-sm font-bold uppercase tracking-wide text-black transition-all duration-150 hover:bg-[#CCFF00]/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CCFF00] active:scale-95"
                  onClick={onClose}
                  type="button"
                >
                  Voltar para jogos
                </button>
              </div>
            </div>
          ) : currentMatch ? (
            <div className="flex h-full w-full items-center justify-center">
              <div className="flex h-full w-full max-w-2xl flex-col rounded-[24px] border border-[#E0E0E0] bg-white p-4 md:h-auto md:p-8 dark:border-[#2A2A2A] dark:bg-[#141414]">
                <div className="rounded-full border border-[#E0E0E0] bg-[#FAFAFA] px-4 py-2 text-center text-sm text-zinc-600 dark:border-[#2A2A2A] dark:bg-[#101010] dark:text-gray-300">
                  {formatMatchKickoff(currentMatch.match_time)}
                </div>

                <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3 md:mt-8 md:gap-4">
                  <div className="text-center">
                    <div className="mx-auto flex justify-center">
                      {renderFlag(currentMatch.home_flag, initials(currentMatch.home_team))}
                    </div>
                    <p className="mt-3 text-sm font-bold uppercase tracking-wide text-[#0A0A0A] md:mt-4 md:text-lg dark:text-white">{currentMatch.home_team}</p>
                  </div>

                  <div className="text-center">
                    <p className="text-3xl font-extrabold text-[#CCFF00] md:text-4xl">x</p>
                  </div>

                  <div className="text-center">
                    <div className="mx-auto flex justify-center">
                      {renderFlag(currentMatch.away_flag, initials(currentMatch.away_team))}
                    </div>
                    <p className="mt-3 text-sm font-bold uppercase tracking-wide text-[#0A0A0A] md:mt-4 md:text-lg dark:text-white">{currentMatch.away_team}</p>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 md:mt-8">
                  <label className="rounded-2xl border border-[#E0E0E0] bg-[#FAFAFA] p-3 md:p-4 dark:border-[#2A2A2A] dark:bg-[#101010]">
                    <span className="text-xs font-bold uppercase tracking-wide text-zinc-500 dark:text-gray-500">Casa</span>
                    <input
                      className="mt-3 h-12 w-full rounded-2xl border border-[#E0E0E0] bg-white px-4 text-center text-2xl font-extrabold text-[#0A0A0A] outline-none transition focus:border-[#CCFF00] md:h-14 md:text-3xl dark:border-[#2A2A2A] dark:bg-[#141414] dark:text-white"
                      inputMode="numeric"
                      min="0"
                      onChange={(event) => setHomeScore(event.target.value)}
                      type="number"
                      value={homeScore}
                    />
                  </label>

                  <label className="rounded-2xl border border-[#E0E0E0] bg-[#FAFAFA] p-3 md:p-4 dark:border-[#2A2A2A] dark:bg-[#101010]">
                    <span className="text-xs font-bold uppercase tracking-wide text-zinc-500 dark:text-gray-500">Fora</span>
                    <input
                      className="mt-3 h-12 w-full rounded-2xl border border-[#E0E0E0] bg-white px-4 text-center text-2xl font-extrabold text-[#0A0A0A] outline-none transition focus:border-[#CCFF00] md:h-14 md:text-3xl dark:border-[#2A2A2A] dark:bg-[#141414] dark:text-white"
                      inputMode="numeric"
                      min="0"
                      onChange={(event) => setAwayScore(event.target.value)}
                      type="number"
                      value={awayScore}
                    />
                  </label>
                </div>

                {errorMessage ? <p className="mt-4 text-sm text-rose-300">{errorMessage}</p> : null}

                <div className="mt-auto grid grid-cols-2 gap-3 pt-5 md:pt-8">
                  <button
                    className="inline-flex min-h-12 cursor-pointer items-center justify-center rounded-full border border-[#E0E0E0] bg-transparent px-5 py-3 text-sm font-bold uppercase tracking-wide text-zinc-600 transition-all duration-150 hover:bg-[#2A2A2A] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CCFF00] active:scale-95 dark:border-[#2A2A2A] dark:text-gray-300 dark:hover:bg-[#1C1C1C] dark:hover:text-white"
                    disabled={saving}
                    onClick={handleSkip}
                    type="button"
                  >
                    Pular
                  </button>
                  <button
                    className="inline-flex min-h-12 cursor-pointer items-center justify-center rounded-full bg-[#CCFF00] px-5 py-3 text-sm font-bold uppercase tracking-wide text-black transition-all duration-150 hover:bg-[#CCFF00]/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CCFF00] active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={saving}
                    onClick={() => void handleSave()}
                    type="button"
                  >
                    {saving ? 'Salvando...' : 'Salvar e Proximo'}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
