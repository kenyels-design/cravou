import { useEffect, useMemo, useState } from 'react';
import type { AuthError } from '@supabase/supabase-js';
import ThemeToggle from '../components/ThemeToggle';
import { Button } from '../components/ui/Button';
import { FeedbackBanner } from '../components/ui/FeedbackBanner';
import { InputField, SelectField } from '../components/ui/InputField';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { normalizeDepartmentName } from '../lib/display';
import { getUserPredictionStats } from '../lib/matches';
import { supabase } from '../lib/supabaseClient';
import { DEPARTMENTS } from '../lib/types';

type RecentHistoryMatch = {
  home_team: string;
  away_team: string;
  home_score: number | null;
  away_score: number | null;
  match_time: string;
  status: string;
};

type RecentHistoryRow = {
  id: string;
  home_score: number;
  away_score: number;
  points: number | null;
  matches: RecentHistoryMatch;
};

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
      label: '25 pts',
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
    className: 'bg-[#FF007F] text-black',
    label: '0 pts',
  };
}

export default function Profile() {
  const { addToast } = useToast();
  const { profile, refreshProfile, signOut, user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [department, setDepartment] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [displayDepartment, setDisplayDepartment] = useState('');
  const [stats, setStats] = useState({
    totalPoints: 0,
    predictionCount: 0,
  });
  const [recentHistory, setRecentHistory] = useState<RecentHistoryRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const avatarInitials = useMemo(() => initials(displayName || profile?.nome || user?.email || 'Camerite'), [displayName, profile?.nome, user?.email]);

  useEffect(() => {
    const normalizedDepartment = normalizeDepartmentName(profile?.departamento ?? null) ?? '';
    const nextName = profile?.nome ?? '';

    setFullName(nextName);
    setDepartment(normalizedDepartment);
    setDisplayName(nextName);
    setDisplayDepartment(normalizedDepartment);
  }, [profile?.departamento, profile?.nome]);

  useEffect(() => {
    let active = true;

    const loadStats = async () => {
      if (!user?.id) {
        if (active) {
          setStats({ totalPoints: 0, predictionCount: 0 });
          setStatsLoading(false);
        }
        return;
      }

      setStatsLoading(true);
      setStatsError(null);

      try {
        const nextStats = await getUserPredictionStats(user.id);

        if (active) {
          setStats(nextStats);
        }
      } catch (error) {
        const message =
          error && typeof error === 'object' && 'message' in error
            ? String(error.message)
            : 'Nao foi possivel carregar seus dados agora.';

        if (active) {
          setStats({ totalPoints: 0, predictionCount: 0 });
          setStatsError(message);
        }
      } finally {
        if (active) {
          setStatsLoading(false);
        }
      }
    };

    void loadStats();

    return () => {
      active = false;
    };
  }, [user?.id]);

  useEffect(() => {
    console.log('[Profile] historico useEffect disparou');

    let active = true;

    const loadRecentHistory = async () => {
      if (!user?.id) {
        if (active) {
          setRecentHistory([]);
          setHistoryLoading(false);
        }
        return;
      }

      setHistoryLoading(true);
      setHistoryError(null);

      try {
        const { data, error } = await supabase
          .schema('cravou')
          .from('predictions')
          .select('id, home_score, away_score, points, matches:match_id(home_team, away_team, home_score, away_score, match_time, status)')
          .eq('user_id', user.id)
          .order('matches(match_time)', { ascending: false })
          .limit(10);

        console.log('[Profile] recent history raw Supabase response', {
          userId: user.id,
          error,
          data,
        });

        if (error) {
          throw error;
        }

        const rows = (
          ((data as Array<{
            id: string;
            home_score: number;
            away_score: number;
            points: number | null;
            matches: RecentHistoryMatch | RecentHistoryMatch[] | null;
          }> | null) ?? [])
            .map((prediction) => {
              const match = Array.isArray(prediction.matches)
                ? prediction.matches[0] ?? null
                : prediction.matches;

              if (!match || match.status !== 'finalizado') {
                return null;
              }

              return {
                ...prediction,
                matches: match,
              };
            })
            .filter((prediction): prediction is RecentHistoryRow => prediction !== null)
        );

        if (active) {
          setRecentHistory(rows);
        }
      } catch (error) {
        const message =
          error && typeof error === 'object' && 'message' in error
            ? String(error.message)
            : 'Nao foi possivel carregar seu historico recente agora.';

        if (active) {
          setRecentHistory([]);
          setHistoryError(message);
        }
      } finally {
        if (active) {
          setHistoryLoading(false);
        }
      }
    };

    void loadRecentHistory();

    return () => {
      active = false;
    };
  }, [user?.id]);

  const handleLogout = async () => {
    setLogoutError(null);
    setLogoutLoading(true);

    try {
      await signOut();
      window.location.hash = '#login';
    } catch (error) {
      const message =
        error && typeof error === 'object' && 'message' in error
          ? (error as AuthError).message
          : 'Nao foi possivel encerrar a sessao agora.';
      setLogoutError(`Falha ao sair: ${message}`);
    } finally {
      setLogoutLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setFullName(displayName);
    setDepartment(displayDepartment);
    setFormError(null);
    setIsEditing(false);
  };

  const handleSaveProfile = async () => {
    if (!user?.id) {
      addToast('Sessao nao encontrada para atualizar o perfil.', 'error');
      return;
    }

    const trimmedName = fullName.trim();

    if (!trimmedName) {
      setFormError('Informe seu nome completo.');
      return;
    }

    if (!department) {
      setFormError('Selecione um departamento.');
      return;
    }

    setSaveLoading(true);
    setFormError(null);

    try {
      const { error } = await supabase
        .from('cravou_users')
        .update({
          nome: trimmedName,
          departamento: department,
        })
        .eq('id', user.id);

      if (error) {
        console.error('Erro ao atualizar public.cravou_users', error);
        throw error;
      }

      const { error: authUpdateError } = await supabase.auth.updateUser({
        data: {
          nome: trimmedName,
          departamento: department,
        },
      });

      if (authUpdateError) {
        console.error('Erro ao sincronizar user_metadata apos atualizar perfil', authUpdateError);
        throw authUpdateError;
      }

      await refreshProfile();
      setFullName(trimmedName);
      setDepartment(department);
      setDisplayName(trimmedName);
      setDisplayDepartment(department);
      setIsEditing(false);
      addToast('Perfil atualizado com sucesso.', 'success');
    } catch (error) {
      console.error('Falha no handleSaveProfile', error);
      const message =
        error && typeof error === 'object' && 'message' in error
          ? String(error.message)
          : 'Nao foi possivel atualizar seu perfil agora.';
      setFormError(message);
      addToast(message, 'error');
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#EEEEF2] px-4 pb-28 pt-6 text-[#0A0A0A] dark:bg-[#0A0A0A] dark:text-white md:px-8 md:pb-12">
      <div className="mx-auto max-w-5xl space-y-5">
        {logoutError ? <FeedbackBanner message={logoutError} tone="error" /> : null}
        {statsError ? <FeedbackBanner message={statsError} tone="error" /> : null}

        <section className="rounded-2xl border border-[#D0D0D8] bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.08)] dark:border-[#2A2A2A] dark:bg-[#141414] dark:shadow-none">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-[#CCFF00] bg-[#EFEFEF] text-2xl font-bold text-[#0A0A0A] dark:bg-[#2A2A2A] dark:text-white">
                {avatarInitials}
              </div>
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wide text-[#FF007F]">Colaborador</p>
                <p className="text-xl font-bold text-[#0A0A0A] dark:text-white">{displayName || 'Colaborador Camerite'}</p>
                <p className="text-sm text-[#555566] dark:text-gray-300">{displayDepartment || 'Sem departamento'}</p>
                <p className="break-all text-sm text-[#555566] dark:text-gray-400">{user?.email ?? 'Sem e-mail'}</p>
              </div>
            </div>

            {!isEditing ? (
              <div className="flex flex-col gap-3 lg:ml-auto lg:flex-row lg:items-center">
                <ThemeToggle />
                <Button
                  className="w-full cursor-pointer bg-[#CCFF00] text-black shadow-none transition-all duration-150 hover:bg-[#CCFF00]/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CCFF00] active:scale-95 lg:w-auto"
                  onClick={() => {
                    setFormError(null);
                    setIsEditing(true);
                  }}
                  type="button"
                >
                  Editar
                </Button>
              </div>
            ) : null}
          </div>

          {isEditing ? (
            <div className="mt-6 rounded-2xl border border-[#D0D0D8] bg-[#F6F6FA] p-4 dark:border-[#2A2A2A] dark:bg-[#101010]">
              <div className="grid gap-4 md:grid-cols-2">
                <InputField
                  autoComplete="name"
                  id="profile-full-name"
                  label="Nome completo"
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="Seu nome"
                  value={fullName}
                />
                <InputField
                  disabled
                  id="profile-email"
                  label="E-mail"
                  value={user?.email ?? ''}
                />
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <SelectField
                  id="profile-department"
                  label="Departamento"
                  onChange={(event) => setDepartment(event.target.value)}
                  options={[
                    { label: 'Selecione seu setor', value: '' },
                    ...DEPARTMENTS.map((item) => ({ label: item, value: item })),
                  ]}
                  value={department}
                />
              </div>

              {formError ? <div className="mt-4"><FeedbackBanner message={formError} tone="error" /></div> : null}

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-end">
                <Button disabled={saveLoading} onClick={handleCancelEdit} type="button" variant="ghost">
                  Cancelar
                </Button>
                <Button
                  className="bg-[#CCFF00] text-black shadow-none hover:bg-[#CCFF00]/90"
                  disabled={saveLoading}
                  onClick={() => void handleSaveProfile()}
                  type="button"
                >
                  {saveLoading ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </div>
          ) : null}
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <article className="rounded-2xl border border-[#D0D0D8] bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.08)] dark:border-[#2A2A2A] dark:bg-[#141414] dark:shadow-none">
            <p className="text-xs font-bold uppercase tracking-wide text-[#555566] dark:text-gray-400">Pontuacao total</p>
            <p className="mt-3 text-5xl font-bold text-[#CCFF00]">{statsLoading ? '...' : stats.totalPoints}</p>
          </article>

          <article className="rounded-2xl border border-[#D0D0D8] bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.08)] dark:border-[#2A2A2A] dark:bg-[#141414] dark:shadow-none">
            <p className="text-xs font-bold uppercase tracking-wide text-[#555566] dark:text-gray-400">Palpites feitos</p>
            <p className="mt-3 text-5xl font-bold text-[#0A0A0A] dark:text-white">{statsLoading ? '...' : stats.predictionCount}</p>
          </article>
        </section>

        <section className="rounded-2xl border border-[#D0D0D8] bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.08)] dark:border-[#2A2A2A] dark:bg-[#141414] dark:shadow-none">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-[#CCFF00]">Historico</p>
              <h2 className="mt-2 text-xl font-bold text-[#0A0A0A] dark:text-white">Meu Historico Recente</h2>
            </div>
          </div>

          {historyError ? <div className="mt-4"><FeedbackBanner message={historyError} tone="error" /></div> : null}

          {historyLoading ? (
            <div className="mt-4 rounded-2xl border border-[#D0D0D8] bg-[#F6F6FA] p-6 text-center text-sm text-[#555566] dark:border-[#2A2A2A] dark:bg-[#101010] dark:text-gray-300">
              Carregando seu historico recente...
            </div>
          ) : recentHistory.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-[#D0D0D8] bg-[#F6F6FA] p-6 text-center text-sm text-[#555566] dark:border-[#2A2A2A] dark:bg-[#101010] dark:text-gray-400">
              Seus resultados aparecerao aqui apos os primeiros jogos.
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {recentHistory.map((prediction) => {
                const badge = pointsBadge(prediction.points);

                return (
                  <article
                    className="flex flex-col gap-3 rounded-2xl border border-[#2A2A2A] bg-[#141414] px-4 py-3 text-white md:flex-row md:items-center md:justify-between"
                    key={prediction.id}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-white">
                        {prediction.matches.home_team} x {prediction.matches.away_team}
                      </p>
                      <div className="mt-1 flex flex-col gap-1 text-xs text-gray-300 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
                        <span>Seu palpite: {prediction.home_score} x {prediction.away_score}</span>
                        <span>Real: {prediction.matches.home_score ?? '--'} x {prediction.matches.away_score ?? '--'}</span>
                      </div>
                    </div>

                    <span className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ${badge.className}`}>
                      {badge.label}
                    </span>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <button
          className="w-full cursor-pointer rounded-xl bg-[#FF007F] p-4 text-sm font-bold uppercase tracking-wide text-black transition-all duration-150 hover:bg-[#FF007F]/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CCFF00] active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={logoutLoading}
          onClick={() => void handleLogout()}
          type="button"
        >
          {logoutLoading ? 'Saindo...' : 'Sair'}
        </button>
      </div>
    </div>
  );
}
