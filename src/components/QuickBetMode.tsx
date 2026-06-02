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
      <span
        aria-hidden="true"
        className={`fi fi-${code} rounded-full`}
        style={{ width: 64, height: 64, display: 'inline-block' }}
      />
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

  const totalMatches = matches.length;
  const currentMatch = matches[currentIndex] ?? null;
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
    <div className="fixed inset-0 z-[70] bg-[#0A0A0A] text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-4 pb-8 pt-6 md:px-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[#FF007F]">Modo Rapido</p>
            <p className="mt-2 text-sm text-gray-400">{progressLabel}</p>
          </div>
          <button
            aria-label="Fechar modo rapido"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-[#2A2A2A] bg-[#141414] text-xl text-white transition hover:bg-[#1C1C1C]"
            onClick={onClose}
            type="button"
          >
            X
          </button>
        </div>

        <div className="mt-6 flex-1">
          {isComplete ? (
            <div className="flex h-full items-center justify-center">
              <div className="w-full max-w-2xl rounded-[24px] border border-[#2A2A2A] bg-[#141414] p-8 text-center">
                <p className="text-xs font-bold uppercase tracking-wide text-[#FF007F]">Concluido</p>
                <h2 className="mt-4 text-3xl font-bold uppercase tracking-wide text-white">Tudo certo por aqui</h2>
                <p className="mt-4 text-lg text-gray-300">{savedCount} palpites salvos no modo rapido.</p>
                <button
                  className="mt-8 inline-flex min-h-12 items-center justify-center rounded-full bg-[#CCFF00] px-6 py-3 text-sm font-bold uppercase tracking-wide text-black transition hover:bg-[#CCFF00]/90"
                  onClick={onClose}
                  type="button"
                >
                  Voltar para jogos
                </button>
              </div>
            </div>
          ) : currentMatch ? (
            <div className="flex h-full items-center justify-center">
              <div className="w-full max-w-2xl rounded-[24px] border border-[#2A2A2A] bg-[#141414] p-6 md:p-8">
                <div className="rounded-full border border-[#2A2A2A] bg-[#101010] px-4 py-2 text-center text-sm text-gray-300">
                  {formatMatchKickoff(currentMatch.match_time)}
                </div>

                <div className="mt-8 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                  <div className="text-center">
                    <div className="mx-auto flex justify-center">
                      {renderFlag(currentMatch.home_flag, initials(currentMatch.home_team))}
                    </div>
                    <p className="mt-4 text-lg font-bold uppercase tracking-wide text-white">{currentMatch.home_team}</p>
                  </div>

                  <div className="text-center">
                    <p className="text-4xl font-extrabold text-[#CCFF00]">x</p>
                  </div>

                  <div className="text-center">
                    <div className="mx-auto flex justify-center">
                      {renderFlag(currentMatch.away_flag, initials(currentMatch.away_team))}
                    </div>
                    <p className="mt-4 text-lg font-bold uppercase tracking-wide text-white">{currentMatch.away_team}</p>
                  </div>
                </div>

                <div className="mt-8 grid gap-4 sm:grid-cols-[1fr_auto_1fr]">
                  <label className="rounded-2xl border border-[#2A2A2A] bg-[#101010] p-4">
                    <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Casa</span>
                    <input
                      className="mt-3 h-14 w-full rounded-2xl border border-[#2A2A2A] bg-[#141414] px-4 text-center text-3xl font-extrabold text-white outline-none transition focus:border-[#CCFF00]"
                      inputMode="numeric"
                      min="0"
                      onChange={(event) => setHomeScore(event.target.value)}
                      type="number"
                      value={homeScore}
                    />
                  </label>

                  <div className="hidden items-center justify-center text-3xl font-extrabold text-gray-500 sm:flex">x</div>

                  <label className="rounded-2xl border border-[#2A2A2A] bg-[#101010] p-4">
                    <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Fora</span>
                    <input
                      className="mt-3 h-14 w-full rounded-2xl border border-[#2A2A2A] bg-[#141414] px-4 text-center text-3xl font-extrabold text-white outline-none transition focus:border-[#CCFF00]"
                      inputMode="numeric"
                      min="0"
                      onChange={(event) => setAwayScore(event.target.value)}
                      type="number"
                      value={awayScore}
                    />
                  </label>
                </div>

                {errorMessage ? <p className="mt-4 text-sm text-rose-300">{errorMessage}</p> : null}

                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-between">
                  <button
                    className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#2A2A2A] bg-transparent px-5 py-3 text-sm font-bold uppercase tracking-wide text-gray-300 transition hover:bg-[#1C1C1C] hover:text-white"
                    disabled={saving}
                    onClick={handleSkip}
                    type="button"
                  >
                    Pular
                  </button>
                  <button
                    className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#CCFF00] px-5 py-3 text-sm font-bold uppercase tracking-wide text-black transition hover:bg-[#CCFF00]/90 disabled:cursor-not-allowed disabled:opacity-60"
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
