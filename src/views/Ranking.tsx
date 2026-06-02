import { useCallback, useEffect, useMemo, useState } from 'react';
import { FeedbackBanner } from '../components/ui/FeedbackBanner';
import { useAuth } from '../context/AuthContext';
import { normalizeDepartmentName } from '../lib/display';
import { getLeaderboard } from '../lib/matches';
import type { Sprint3LeaderboardEntry } from '../lib/types';

type RankingMode = 'geral' | 'departamento';

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function departmentColor(department: string | null) {
  const normalizedDepartment = normalizeDepartmentName(department);

  if (!normalizedDepartment) {
    return 'bg-[#2A2A2A]';
  }

  const palette = ['bg-[#2A2A2A]', 'bg-[#1C2A44]', 'bg-[#2A1C44]', 'bg-[#143514]', 'bg-[#45260A]'];
  const index =
    normalizedDepartment
      .split('')
      .reduce((sum, char) => sum + char.charCodeAt(0), 0) % palette.length;
  return palette[index];
}

function PodiumCard({
  entry,
  position,
}: {
  entry: Sprint3LeaderboardEntry;
  position: 1 | 2 | 3;
}) {
  const ringClass =
    position === 1
      ? 'ring-2 ring-[#CCFF00] shadow-[0_0_20px_#CCFF00]'
      : position === 2
        ? 'ring-1 ring-white'
        : 'ring-1 ring-amber-500';
  const avatarSize = position === 1 ? 'h-14 w-14 text-base border-[#CCFF00]' : 'h-11 w-11 text-sm border-white/40';
  const pointsClass = position === 1 ? 'text-[#CCFF00] text-2xl' : position === 3 ? 'text-amber-500' : 'text-white';
  const orderClass = position === 1 ? 'order-2' : position === 2 ? 'order-1' : 'order-3';

  return (
    <div className={`${orderClass} flex flex-col items-center`}>
      <div className={`rounded-xl bg-[#141414] p-4 text-center ${ringClass}`}>
        <div
          className={`mx-auto flex ${avatarSize} items-center justify-center rounded-full border-2 font-bold text-white ${departmentColor(entry.departamento)}`}
        >
          {initials(entry.nome)}
        </div>
        <p className="mt-3 text-sm font-bold text-white">{entry.nome}</p>
        <p className={`mt-2 font-bold ${pointsClass}`}>{entry.total_points}</p>
      </div>
      <span className="mt-2 text-xs text-gray-500">{position}º</span>
    </div>
  );
}

export default function Ranking() {
  const { user, profile } = useAuth();
  const [entries, setEntries] = useState<Sprint3LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mode, setMode] = useState<RankingMode>('geral');

  const loadRanking = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const rows = await getLeaderboard();
      setEntries(rows);
    } catch (error) {
      const message =
        error && typeof error === 'object' && 'message' in error
          ? String(error.message)
          : 'Nao foi possivel carregar o ranking agora.';
      setErrorMessage(message);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRanking();
  }, [loadRanking]);

  const visibleEntries = useMemo(() => {
    const currentDepartment = normalizeDepartmentName(profile?.departamento ?? null);

    if (mode === 'departamento' && currentDepartment) {
      return entries.filter((entry) => normalizeDepartmentName(entry.departamento) === currentDepartment);
    }

    return entries;
  }, [entries, mode, profile?.departamento]);

  const podium = visibleEntries.slice(0, 3);
  const rest = visibleEntries.slice(3);

  return (
    <div className="min-h-screen bg-[#F5F5F5] px-4 pb-28 pt-6 text-[#0A0A0A] dark:bg-[#0A0A0A] dark:text-white md:px-8 md:pb-12">
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="flex flex-col gap-4 rounded-[16px] border border-[#E0E0E0] bg-white p-5 dark:border-[#2A2A2A] dark:bg-[#141414] md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[#FF007F]">Ranking</p>
            <h2 className="mt-2 text-2xl font-bold text-[#0A0A0A] dark:text-white">Classificacao da rodada</h2>
          </div>

          <div className="flex rounded-full bg-[#F5F5F5] p-1 dark:bg-[#141414]">
            {([
              ['geral', 'Geral'],
              ['departamento', 'Departamento'],
            ] as const).map(([value, label]) => {
              const isActive = mode === value;

              return (
                <button
                  className={`rounded-full px-4 py-1 text-sm font-bold transition ${
                    isActive ? 'bg-[#CCFF00] text-black' : 'text-zinc-600 dark:text-gray-400'
                  }`}
                  key={value}
                  onClick={() => setMode(value)}
                  type="button"
                >
                  {label}
                </button>
              );
            })}
          </div>
        </header>

        {errorMessage ? <FeedbackBanner message={errorMessage} tone="error" /> : null}

        {loading ? (
          <div className="rounded-[16px] border border-[#E0E0E0] bg-white p-10 text-center text-sm text-zinc-600 dark:border-[#2A2A2A] dark:bg-[#141414] dark:text-gray-300">
            Carregando ranking...
          </div>
        ) : visibleEntries.length === 0 ? (
          <div className="rounded-[16px] border border-dashed border-[#E0E0E0] bg-white p-10 text-center text-sm text-zinc-500 dark:border-[#2A2A2A] dark:bg-[#141414] dark:text-gray-400">
            Ainda nao ha pontuacao consolidada para exibir.
          </div>
        ) : (
          <>
            <section className="rounded-[16px] border border-[#E0E0E0] bg-[#FAFAFA] p-6 dark:border-[#2A2A2A] dark:bg-[#101010]">
              <div className="flex items-end justify-center gap-4">
                {podium[1] ? <PodiumCard entry={podium[1]} position={2} /> : null}
                {podium[0] ? <PodiumCard entry={podium[0]} position={1} /> : null}
                {podium[2] ? <PodiumCard entry={podium[2]} position={3} /> : null}
              </div>
            </section>

            <section className="rounded-[16px] border border-[#E0E0E0] bg-white p-4 dark:border-[#2A2A2A] dark:bg-[#141414]">
              {rest.length > 0 ? (
                rest.map((entry, index) => {
                  const isCurrentUser = user?.id === entry.user_id;

                  return (
                    <div
                      className={`flex items-center gap-3 border-b border-[#1A1A1A] py-3 last:border-b-0 ${
                        isCurrentUser ? 'border-l-2 border-[#CCFF00] bg-[#1A2A1A] pl-2' : ''
                      }`}
                      key={entry.user_id}
                    >
                      <span className="w-8 text-sm font-bold text-gray-500">{index + 4}</span>
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white ${departmentColor(
                          entry.departamento,
                        )}`}
                      >
                        {initials(entry.nome)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`truncate text-sm font-semibold ${isCurrentUser ? 'text-[#CCFF00]' : 'text-white'}`}>
                          {entry.nome}
                        </p>
                        <p className="text-xs text-gray-500">{normalizeDepartmentName(entry.departamento) ?? 'Nao informado'}</p>
                      </div>
                      <span className="text-sm font-bold text-white">{entry.total_points} pts</span>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-gray-400">Somente o podium possui entradas neste momento.</p>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
