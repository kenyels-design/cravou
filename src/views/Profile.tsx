import { useEffect, useMemo, useState } from 'react';
import type { AuthError } from '@supabase/supabase-js';
import { Button } from '../components/ui/Button';
import { FeedbackBanner } from '../components/ui/FeedbackBanner';
import { InputField, SelectField } from '../components/ui/InputField';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { normalizeDepartmentName } from '../lib/display';
import { getUserPredictionStats } from '../lib/matches';
import { supabase } from '../lib/supabaseClient';
import { DEPARTMENTS } from '../lib/types';

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
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
  const [stats, setStats] = useState({
    totalPoints: 0,
    predictionCount: 0,
  });

  const avatarInitials = useMemo(() => initials(profile?.nome ?? user?.email ?? 'Camerite'), [profile?.nome, user?.email]);

  useEffect(() => {
    setFullName(profile?.nome ?? '');
    setDepartment(normalizeDepartmentName(profile?.departamento ?? null) ?? '');
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
    setFullName(profile?.nome ?? '');
    setDepartment(normalizeDepartmentName(profile?.departamento ?? null) ?? '');
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
        throw error;
      }

      await refreshProfile();
      setIsEditing(false);
      addToast('Perfil atualizado com sucesso.', 'success');
    } catch (error) {
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

            {!isEditing ? (
              <div className="lg:ml-auto">
                <Button
                  className="w-full bg-[#CCFF00] text-black shadow-none hover:bg-[#CCFF00]/90 lg:w-auto"
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
            <div className="mt-6 rounded-2xl border border-[#2A2A2A] bg-[#101010] p-4">
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
