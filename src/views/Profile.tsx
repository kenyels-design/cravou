import { useEffect, useMemo, useState } from 'react';
import type { AuthError } from '@supabase/supabase-js';
import { FeedbackBanner } from '../components/ui/FeedbackBanner';
import { useAuth } from '../context/AuthContext';
import { normalizeDepartmentName } from '../lib/display';
import { getUserPredictionStats } from '../lib/matches';

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export default function Profile() {
  const { profile, signOut, user } = useAuth();
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalPoints: 0,
    predictionCount: 0,
  });

  const avatarInitials = useMemo(() => initials(profile?.nome ?? user?.email ?? 'Camerite'), [profile?.nome, user?.email]);

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

  return (
    <div className="min-h-screen bg-[#0A0A0A] px-4 pb-28 pt-6 text-white md:px-8 md:pb-12">
      <div className="mx-auto max-w-5xl space-y-5">
        {logoutError ? <FeedbackBanner message={logoutError} tone="error" /> : null}
        {statsError ? <FeedbackBanner message={statsError} tone="error" /> : null}

        <section className="rounded-2xl border border-[#2A2A2A] bg-[#141414] p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-[#CCFF00] bg-[#2A2A2A] text-2xl font-bold text-white">
                {avatarInitials}
              </div>
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wide text-[#FF007F]">Colaborador</p>
                <p className="text-xl font-bold text-white">{profile?.nome ?? 'Colaborador Camerite'}</p>
                <p className="text-sm text-gray-300">{normalizeDepartmentName(profile?.departamento ?? null) ?? 'Sem departamento'}</p>
                <p className="break-all text-sm text-gray-400">{user?.email ?? 'Sem e-mail'}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <article className="rounded-2xl border border-[#2A2A2A] bg-[#141414] p-6">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Pontuacao total</p>
            <p className="mt-3 text-5xl font-bold text-[#CCFF00]">{statsLoading ? '...' : stats.totalPoints}</p>
          </article>

          <article className="rounded-2xl border border-[#2A2A2A] bg-[#141414] p-6">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Palpites feitos</p>
            <p className="mt-3 text-5xl font-bold text-white">{statsLoading ? '...' : stats.predictionCount}</p>
          </article>
        </section>

        <button
          className="w-full rounded-xl bg-[#FF007F] p-4 text-sm font-bold uppercase tracking-wide text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
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
