import { useCallback, useEffect, useMemo, useState } from 'react';
import { FeedbackBanner } from '../components/ui/FeedbackBanner';
import { useAuth } from '../context/AuthContext';
import { normalizeDepartmentName } from '../lib/display';
import { getLeaderboard } from '../lib/matches';
import { DEPARTMENTS } from '../lib/types';
import type { DepartmentName, Sprint3LeaderboardEntry } from '../lib/types';

type RankingMode = 'geral' | 'departamento';

type PodiumPosition = 1 | 2 | 3;

type DepartmentRankingCard = {
  department: DepartmentName;
  participants: number;
  totalPoints: number;
  members: Sprint3LeaderboardEntry[];
};

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function abbreviatedName(name: string) {
  const parts = name.split(' ').filter(Boolean);
  if (parts.length === 0) {
    return 'Sem nome';
  }

  if (parts.length === 1) {
    return parts[0];
  }

  return `${parts[0]} ${parts[parts.length - 1][0]?.toUpperCase() ?? ''}.`;
}

function departmentColor(department: string | null) {
  const normalizedDepartment = normalizeDepartmentName(department);

  if (!normalizedDepartment) {
    return 'from-[#2A2A2A] to-[#1A1A1A]';
  }

  const palette = [
    'from-[#CCFF00] to-[#6A8400]',
    'from-[#FF007F] to-[#7A1248]',
    'from-[#5CE1E6] to-[#1D6A76]',
    'from-[#F59E0B] to-[#7C4A03]',
    'from-[#8B5CF6] to-[#49327E]',
  ];

  const index =
    normalizedDepartment
      .split('')
      .reduce((sum, char) => sum + char.charCodeAt(0), 0) % palette.length;

  return palette[index];
}

function podiumStyle(position: PodiumPosition) {
  if (position === 1) {
    return {
      wrapper: 'md:-mt-6 md:self-start',
      card: 'min-h-[320px] w-full max-w-[280px] border-[#CCFF00]/40 bg-[radial-gradient(circle_at_top,_rgba(204,255,0,0.2),_transparent_55%),#FFFFFF] shadow-[0_0_50px_rgba(204,255,0,0.22),0_2px_8px_rgba(0,0,0,0.08)] dark:bg-[radial-gradient(circle_at_top,_rgba(204,255,0,0.2),_transparent_55%),#141414] dark:shadow-[0_0_50px_rgba(204,255,0,0.22)]',
      avatar: 'h-24 w-24 border-[#CCFF00] text-2xl shadow-[0_0_24px_rgba(204,255,0,0.35)]',
      place: 'text-7xl text-[#CCFF00]',
      points: 'text-[#CCFF00]',
      badge: 'border-[#CCFF00]/40 bg-[#CCFF00]/12 text-[#CCFF00]',
    };
  }

  if (position === 2) {
    return {
      wrapper: 'md:translate-y-10',
      card: 'min-h-[272px] w-full max-w-[240px] border-[#D0D0D8] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-[#141414] dark:shadow-none',
      avatar: 'h-20 w-20 border-[#D4D4D8] text-xl',
      place: 'text-6xl text-[#0A0A0A] dark:text-white',
      points: 'text-[#0A0A0A] dark:text-white',
      badge: 'border-[#D0D0D8] bg-[#F6F6FA] text-[#555566] dark:border-white/10 dark:bg-white/5 dark:text-gray-300',
    };
  }

  return {
    wrapper: 'md:translate-y-16',
    card: 'min-h-[248px] w-full max-w-[220px] border-[#FF007F]/20 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.08)] dark:bg-[#141414] dark:shadow-none',
    avatar: 'h-16 w-16 border-[#FF007F] text-lg',
    place: 'text-5xl text-[#FF007F]',
    points: 'text-[#FF007F]',
    badge: 'border-[#FF007F]/20 bg-[#FFF1F7] text-[#FF007F] dark:bg-[#FF007F]/8 dark:text-[#FF66B2]',
  };
}

function PodiumCard({
  entry,
  position,
  highlight,
}: {
  entry: Sprint3LeaderboardEntry;
  position: PodiumPosition;
  highlight: boolean;
}) {
  const style = podiumStyle(position);
  const departmentLabel = normalizeDepartmentName(entry.departamento) ?? 'Sem departamento';

  return (
    <article className={`flex w-full justify-center ${style.wrapper}`}>
      <div
        className={`relative flex w-full flex-col overflow-hidden rounded-[28px] border px-5 pb-6 pt-5 ${
          style.card
        } ${highlight ? 'ring-1 ring-[#CCFF00]/60' : ''}`}
      >
        <div className="absolute inset-x-5 top-5 flex items-start justify-between">
          <span className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] ${style.badge}`}>
            Top {position}
          </span>
          {highlight ? (
            <span className="rounded-full border border-[#CCFF00]/30 bg-[#CCFF00]/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[#CCFF00]">
              Voce
            </span>
          ) : null}
        </div>

        <div className="mt-10 flex flex-1 flex-col items-center text-center">
          <span className={`text-center font-black leading-none ${style.place}`}>{position}</span>

          <div
            className={`mt-4 flex items-center justify-center rounded-full border-2 bg-gradient-to-br ${departmentColor(
              entry.departamento,
            )} font-black text-white ${style.avatar}`}
          >
            {initials(entry.nome)}
          </div>

          <p className="mt-5 text-lg font-bold text-[#0A0A0A] dark:text-white">{abbreviatedName(entry.nome)}</p>
          <p className="mt-2 text-xs uppercase tracking-[0.24em] text-[#555566] dark:text-gray-500">{departmentLabel}</p>
          <p className={`mt-5 text-3xl font-black ${style.points}`}>{entry.total_points} pts</p>
        </div>
      </div>
    </article>
  );
}

export default function Ranking() {
  const { user, profile } = useAuth();
  const [entries, setEntries] = useState<Sprint3LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mode, setMode] = useState<RankingMode>('geral');
  const [expandedDepartment, setExpandedDepartment] = useState<DepartmentName | null>(null);

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

  const visibleEntries = useMemo(() => entries, [entries]);

  const departmentCards = useMemo<DepartmentRankingCard[]>(() => {
    const grouped = new Map<DepartmentName, DepartmentRankingCard>();

    DEPARTMENTS.forEach((department) => {
      grouped.set(department, {
        department,
        participants: 0,
        totalPoints: 0,
        members: [],
      });
    });

    entries.forEach((entry) => {
      const department = normalizeDepartmentName(entry.departamento);

      if (!department || !grouped.has(department as DepartmentName)) {
        return;
      }

      const current = grouped.get(department as DepartmentName);

      if (!current) {
        return;
      }

      current.participants += 1;
      current.totalPoints += entry.total_points;
      current.members.push(entry);
    });

    return Array.from(grouped.values())
      .map((card) => ({
        ...card,
        members: [...card.members].sort((left, right) => {
          if (right.total_points !== left.total_points) {
            return right.total_points - left.total_points;
          }

          return left.nome.localeCompare(right.nome, 'pt-BR');
        }),
      }))
      .sort((left, right) => {
        if (right.totalPoints !== left.totalPoints) {
          return right.totalPoints - left.totalPoints;
        }

        return DEPARTMENTS.indexOf(left.department) - DEPARTMENTS.indexOf(right.department);
      });
  }, [entries]);

  const leadingDepartmentPoints = departmentCards[0]?.totalPoints ?? 0;
  const currentDepartment = normalizeDepartmentName(profile?.departamento ?? null);

  const podium = visibleEntries.slice(0, 3);
  const rest = visibleEntries.slice(3);

  return (
    <div className="min-h-screen bg-[#EEEEF2] px-4 pb-28 pt-6 text-[#0A0A0A] dark:bg-[#0A0A0A] dark:text-white md:px-8 md:pb-12">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="overflow-hidden rounded-[28px] border border-[#D0D0D8] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.08)] dark:border-[#2A2A2A] dark:bg-[#141414] dark:shadow-none">
          <div className="border-b border-[#D0D0D8] bg-[radial-gradient(circle_at_top_left,_rgba(204,255,0,0.12),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(255,0,127,0.12),_transparent_32%),#FFFFFF] px-5 py-6 dark:border-[#2A2A2A] dark:bg-[radial-gradient(circle_at_top_left,_rgba(204,255,0,0.12),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(255,0,127,0.12),_transparent_32%),#141414] md:px-7">
            <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#CCFF00]">Ranking</p>
                <h2 className="mt-3 text-3xl font-black tracking-tight text-[#0A0A0A] dark:text-white">
                  {mode === 'geral' ? 'Podio da rodada' : 'Performance por departamento'}
                </h2>
                <p className="mt-2 max-w-2xl text-sm text-[#555566] dark:text-gray-400">
                  {mode === 'geral'
                    ? 'Veja quem lidera no ranking geral, com podio e lista completa de participantes.'
                    : 'Compare os 8 departamentos oficiais pela pontuacao total e expanda um card para ver o ranking interno.'}
                </p>
              </div>

              <div className="inline-flex rounded-full border border-[#D0D0D8] bg-[#F6F6FA] p-1 dark:border-[#2A2A2A] dark:bg-[#0A0A0A]">
                {([
                  ['geral', 'RANKING GERAL'],
                  ['departamento', 'POR DEPARTAMENTO'],
                ] as const).map(([value, label]) => {
                  const isActive = mode === value;

                  return (
                    <button
                      className={`cursor-pointer rounded-full px-4 py-2 text-[11px] font-bold tracking-[0.16em] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CCFF00] active:scale-95 md:px-5 ${
                        isActive
                          ? 'bg-[#CCFF00] text-black shadow-[0_0_20px_rgba(204,255,0,0.25)]'
                          : 'text-[#555566] hover:opacity-80 hover:text-[#0A0A0A] dark:text-gray-400 dark:hover:text-white'
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
            </div>
          </div>
        </header>

        {errorMessage ? <FeedbackBanner message={errorMessage} tone="error" /> : null}

        {loading ? (
          <div className="rounded-[24px] border border-[#D0D0D8] bg-white p-10 text-center text-sm text-[#555566] shadow-[0_2px_8px_rgba(0,0,0,0.08)] dark:border-[#2A2A2A] dark:bg-[#141414] dark:text-gray-300 dark:shadow-none">
            Carregando ranking...
          </div>
        ) : mode === 'geral' && visibleEntries.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-[#D0D0D8] bg-white p-10 text-center text-sm text-[#555566] shadow-[0_2px_8px_rgba(0,0,0,0.08)] dark:border-[#2A2A2A] dark:bg-[#141414] dark:text-gray-400 dark:shadow-none">
            Ainda nao ha pontuacao consolidada para exibir.
          </div>
        ) : mode === 'departamento' && departmentCards.every((card) => card.participants === 0) ? (
          <div className="rounded-[24px] border border-dashed border-[#D0D0D8] bg-white p-10 text-center text-sm text-[#555566] shadow-[0_2px_8px_rgba(0,0,0,0.08)] dark:border-[#2A2A2A] dark:bg-[#141414] dark:text-gray-400 dark:shadow-none">
            Ainda nao ha participantes vinculados aos departamentos oficiais.
          </div>
        ) : (
          <>
            {mode === 'geral' ? (
              <>
                <section className="rounded-[28px] border border-[#D0D0D8] bg-[#F6F6FA] px-4 py-6 shadow-[0_2px_8px_rgba(0,0,0,0.08)] dark:border-[#2A2A2A] dark:bg-[#141414] dark:shadow-none md:px-6">
                  <div className="grid gap-4 md:grid-cols-[0.9fr_1.1fr_0.85fr] md:items-end">
                    {podium[1] ? (
                      <PodiumCard entry={podium[1]} highlight={user?.id === podium[1].user_id} position={2} />
                    ) : (
                      <div className="hidden md:block" />
                    )}
                    {podium[0] ? (
                      <PodiumCard entry={podium[0]} highlight={user?.id === podium[0].user_id} position={1} />
                    ) : null}
                    {podium[2] ? (
                      <PodiumCard entry={podium[2]} highlight={user?.id === podium[2].user_id} position={3} />
                    ) : (
                      <div className="hidden md:block" />
                    )}
                  </div>
                </section>

                <section className="rounded-[28px] border border-[#D0D0D8] bg-white p-3 shadow-[0_2px_8px_rgba(0,0,0,0.08)] dark:border-[#2A2A2A] dark:bg-[#141414] dark:shadow-none md:p-4">
                  <div className="flex items-center justify-between border-b border-[#D0D0D8] px-3 pb-3 dark:border-[#2A2A2A]">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#FF007F]">Demais colocacoes</p>
                      <p className="mt-1 text-sm text-[#555566] dark:text-gray-400">Do 4o lugar em diante, em modo compacto.</p>
                    </div>
                    <span className="rounded-full border border-[#D0D0D8] bg-[#E8E8F0] px-3 py-1 text-xs font-semibold text-[#555566] dark:border-[#2A2A2A] dark:bg-[#0A0A0A] dark:text-gray-300">
                      {rest.length} participantes
                    </span>
                  </div>

                  {rest.length > 0 ? (
                    <div className="mt-2 divide-y divide-[#D0D0D8] dark:divide-[#2A2A2A]">
                      {rest.map((entry, index) => {
                        const isCurrentUser = user?.id === entry.user_id;
                        const rank = index + 4;

                        return (
                          <div
                            className={`grid grid-cols-[40px_48px_minmax(0,1fr)_auto] items-center gap-3 px-3 py-3 transition md:grid-cols-[52px_56px_minmax(0,1.2fr)_minmax(0,0.9fr)_auto] ${
                              isCurrentUser ? 'rounded-2xl bg-[#F6FFE0] dark:bg-[#191919]' : ''
                            }`}
                            key={entry.user_id}
                          >
                            <span className={`text-xl font-black ${isCurrentUser ? 'text-[#0A0A0A] dark:text-[#CCFF00]' : 'text-[#555566] dark:text-gray-500'}`}>{rank}</span>

                            <div
                              className={`flex h-11 w-11 items-center justify-center rounded-full border border-[#D0D0D8] bg-gradient-to-br ${departmentColor(
                                entry.departamento,
                              )} text-sm font-black text-white dark:border-[#2A2A2A]`}
                            >
                              {initials(entry.nome)}
                            </div>

                            <div className="min-w-0">
                              <p className={`truncate text-sm font-semibold ${isCurrentUser ? 'text-[#0A0A0A] dark:text-[#CCFF00]' : 'text-[#0A0A0A] dark:text-white'}`}>
                                {abbreviatedName(entry.nome)}
                              </p>
                              <p className="truncate text-xs text-[#555566] dark:text-gray-500 md:hidden">
                                {normalizeDepartmentName(entry.departamento) ?? 'Nao informado'}
                              </p>
                            </div>

                            <p className="hidden truncate text-sm text-[#555566] dark:text-gray-400 md:block">
                              {normalizeDepartmentName(entry.departamento) ?? 'Nao informado'}
                            </p>

                            <span className={`text-sm font-black ${isCurrentUser ? 'text-[#FF007F]' : 'text-[#0A0A0A] dark:text-white'}`}>
                              {entry.total_points} pts
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="px-3 py-6 text-sm text-[#555566] dark:text-gray-400">Somente o podio possui entradas neste momento.</p>
                  )}
                </section>
              </>
            ) : (
              <section className="space-y-4">
                {departmentCards.map((card, index) => {
                  const isExpanded = expandedDepartment === card.department;
                  const isLeader = index === 0 && card.totalPoints > 0;
                  const isCurrentDepartment = currentDepartment === card.department;
                  const progressWidth =
                    leadingDepartmentPoints > 0 ? Math.max((card.totalPoints / leadingDepartmentPoints) * 100, card.totalPoints > 0 ? 10 : 0) : 0;

                  return (
                    <article
                      className={`overflow-hidden rounded-[28px] border bg-white shadow-[0_2px_8px_rgba(0,0,0,0.08)] transition dark:bg-[#141414] dark:shadow-none ${
                        isExpanded
                          ? 'border-[#CCFF00]/70'
                          : isCurrentDepartment
                            ? 'border-[#CCFF00]/40'
                            : 'border-[#D0D0D8] dark:border-[#2A2A2A]'
                      }`}
                      key={card.department}
                    >
                      <button
                        className="flex w-full flex-col gap-5 px-5 py-5 text-left md:px-6"
                        onClick={() =>
                          setExpandedDepartment((current) => (current === card.department ? null : card.department))
                        }
                        type="button"
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-2xl font-black tracking-tight text-[#0A0A0A] dark:text-white">{card.department}</h3>
                              {isLeader ? (
                                <span className="rounded-full border border-[#CCFF00]/40 bg-[#CCFF00]/12 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-[#6A8400] dark:text-[#CCFF00]">
                                  Lider
                                </span>
                              ) : null}
                              {isCurrentDepartment ? (
                                <span className="rounded-full border border-[#D0D0D8] bg-[#F6F6FA] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-[#555566] dark:border-[#2A2A2A] dark:bg-[#0A0A0A] dark:text-gray-300">
                                  Seu departamento
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-2 text-sm text-[#555566] dark:text-gray-400">
                              {card.participants} participante{card.participants === 1 ? '' : 's'}
                            </p>
                          </div>

                          <div className="shrink-0">
                            <p className={`text-3xl font-black ${isLeader ? 'text-[#6A8400] dark:text-[#CCFF00]' : 'text-[#0A0A0A] dark:text-white'}`}>
                              {card.totalPoints} pts
                            </p>
                            <p className="mt-1 text-xs uppercase tracking-[0.2em] text-[#555566] dark:text-gray-500">
                              Total do departamento
                            </p>
                          </div>
                        </div>

                        <div>
                          <div className="h-4 overflow-hidden rounded-full bg-[#E8E8F0] dark:bg-[#0A0A0A]">
                            <div
                              className={`h-full rounded-full transition-[width] duration-300 ${
                                isLeader ? 'bg-[#CCFF00]' : 'bg-[#CFCFD6] dark:bg-[#F2F2F2]'
                              }`}
                              style={{ width: `${progressWidth}%` }}
                            />
                          </div>
                          <div className="mt-3 flex items-center justify-between text-xs uppercase tracking-[0.18em] text-[#555566] dark:text-gray-500">
                            <span>Forca relativa</span>
                            <span>{Math.round(progressWidth)}%</span>
                          </div>
                        </div>
                      </button>

                      {isExpanded ? (
                        <div className="border-t border-[#D0D0D8] bg-[#F6F6FA] px-5 py-4 dark:border-[#2A2A2A] dark:bg-[#101010] md:px-6">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#FF007F]">Ranking interno</p>
                            <span className="text-xs text-[#555566] dark:text-gray-500">{card.members.length} membros</span>
                          </div>

                          {card.members.length > 0 ? (
                            <div className="mt-3 space-y-2">
                              {card.members.map((member, memberIndex) => {
                                const isCurrentUser = user?.id === member.user_id;

                                return (
                                  <div
                                    className={`grid grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl px-3 py-2 ${
                                      isCurrentUser ? 'bg-[#F6FFE0] dark:bg-[#191919]' : 'bg-white dark:bg-[#141414]'
                                    }`}
                                    key={member.user_id}
                                  >
                                    <span className={`text-sm font-black ${isCurrentUser ? 'text-[#CCFF00] dark:text-[#CCFF00]' : 'text-[#555566] dark:text-gray-500'}`}>
                                      {memberIndex + 1}
                                    </span>
                                    <p className={`truncate text-sm font-semibold ${isCurrentUser ? 'text-[#0A0A0A] dark:text-white' : 'text-[#0A0A0A] dark:text-white'}`}>
                                      {member.nome}
                                    </p>
                                    <span className={`text-sm font-black ${isCurrentUser ? 'text-[#FF007F]' : 'text-[#0A0A0A] dark:text-white'}`}>
                                      {member.total_points} pts
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="mt-3 text-sm text-[#555566] dark:text-gray-400">Nenhum participante vinculado a este departamento.</p>
                          )}
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
