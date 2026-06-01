import { useState } from 'react';
import type { AuthError } from '@supabase/supabase-js';
import { Button } from '../components/ui/Button';
import { FeedbackBanner } from '../components/ui/FeedbackBanner';
import { useAuth } from '../context/AuthContext';

export default function Profile() {
  const { profile, signOut, user } = useAuth();
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

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
    <div className="min-h-screen bg-background px-4 pb-28 pt-6 text-white md:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="rounded-bento-lg border border-white/10 bg-white/5 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-secondary">Perfil</p>
              <h1 className="mt-3 text-3xl font-black uppercase tracking-[0.08em] text-white">Seu cadastro</h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-300">
                Consulte seus dados de acesso e mantenha sua participacao no Top 3 vinculada ao cadastro correto.
              </p>
            </div>

            <div className="w-full sm:w-auto">
              <Button
                className="w-full sm:w-auto"
                disabled={logoutLoading}
                onClick={() => void handleLogout()}
                type="button"
                variant="secondary"
              >
                {logoutLoading ? 'Saindo...' : 'Sair'}
              </Button>
            </div>
          </div>
        </header>

        {logoutError ? <FeedbackBanner message={logoutError} tone="error" /> : null}

        <section className="grid gap-4 md:grid-cols-[1.15fr_0.85fr]">
          <article className="rounded-bento-lg border border-white/10 bg-white/5 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl">
            <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Dados do colaborador</p>
            <div className="mt-6 space-y-4">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Nome</p>
                <p className="mt-1 text-xl font-semibold text-white">{profile?.nome ?? 'Nao informado'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Departamento</p>
                <p className="mt-1 text-xl font-semibold text-white">{profile?.departamento ?? 'Nao informado'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">E-mail</p>
                <p className="mt-1 break-all text-base text-zinc-200">{user?.email ?? 'Nao informado'}</p>
              </div>
            </div>
          </article>

          <article className="rounded-bento-lg border border-white/10 bg-white/5 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl">
            <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Pontuacao futura</p>
            <p className="mt-6 text-6xl font-black text-primary">{profile?.pontos_totais ?? 0}</p>
            <p className="mt-3 text-sm text-zinc-300">
              Esta area fica reservada para a comparacao entre sua aposta no Top 3 final e o resultado oficial da Copa.
            </p>
          </article>
        </section>
      </div>
    </div>
  );
}
