import type { ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { authLoading, profile, profileLoading, user } = useAuth();

  if (authLoading || (user && profileLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 text-white">
        <div className="rounded-bento border border-white/10 bg-white/5 px-8 py-7 text-center shadow-glow-primary backdrop-blur-xl">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-white/10 border-t-primary" />
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Sincronizando perfil</p>
        </div>
      </div>
    );
  }

  if (user && profile) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 text-white">
      <div className="max-w-md rounded-bento-lg border border-secondary/25 bg-white/5 p-8 text-center shadow-glow-secondary backdrop-blur-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-secondary">Acesso bloqueado</p>
        <h2 className="mt-4 text-2xl font-black uppercase tracking-[0.08em] text-white">
          Perfil nao encontrado
        </h2>
        <p className="mt-3 text-sm leading-6 text-zinc-300">
          Sua sessao existe, mas o perfil em <code>cravou_users</code> nao foi localizado. Entre novamente ou fale com a administracao para revisar o cadastro.
        </p>
        <button
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-pill bg-primary px-5 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-black transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          onClick={() => {
            window.location.hash = '#login';
          }}
          type="button"
        >
          Voltar ao login
        </button>
      </div>
    </div>
  );
}
