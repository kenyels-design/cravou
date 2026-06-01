import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import {
  isRefreshTokenError,
  persistAuthNotice,
  syncAndFetchUserProfile,
} from '../lib/auth';
import type { UserProfile } from '../lib/types';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  authLoading: boolean;
  profileLoading: boolean;
  isRecoveryMode: boolean;
  isAdmin: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);

  const clearAuthState = useCallback(() => {
    setSession(null);
    setUser(null);
    setProfile(null);
    setIsRecoveryMode(false);
  }, []);

  const handleAuthFailure = useCallback(
    async (error: unknown, fallbackMessage: string) => {
      console.error(fallbackMessage, error);

      if (isRefreshTokenError(error)) {
        persistAuthNotice('Sua sessao expirou por seguranca. Faca login novamente.');
      }

      clearAuthState();
      await supabase.auth.signOut();
      window.location.hash = '#login';
    },
    [clearAuthState],
  );

  const loadProfileForUser = useCallback(
    async (targetUser: User) => {
      setProfileLoading(true);

      try {
        const nextProfile = await syncAndFetchUserProfile(targetUser);
        setProfile(nextProfile ?? null);
        return nextProfile ?? null;
      } catch (error) {
        await handleAuthFailure(error, 'Falha ao carregar perfil do usuario.');
        return null;
      } finally {
        setProfileLoading(false);
      }
    },
    [handleAuthFailure],
  );

  const refreshProfile = useCallback(async () => {
    const activeUser = user;

    if (!activeUser) {
      setProfile(null);
      return;
    }

    await loadProfileForUser(activeUser);
  }, [loadProfileForUser, user]);

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        const {
          data: { session: initialSession },
        } = await supabase.auth.getSession();

        if (!mounted) {
          return;
        }

        const recoveryMode =
          new URLSearchParams(window.location.search).get('mode') === 'reset-password';

        setSession(initialSession ?? null);
        setUser(initialSession?.user ?? null);
        setIsRecoveryMode(recoveryMode);

        if (initialSession?.user) {
          if (!mounted) {
            return;
          }

          await loadProfileForUser(initialSession.user);
        } else {
          setProfile(null);
        }
      } catch (error) {
        await handleAuthFailure(error, 'Falha ao inicializar autenticacao.');
      } finally {
        if (mounted) {
          setAuthLoading(false);
        }
      }
    };

    void initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession ?? null);
      setUser(nextSession?.user ?? null);
      setIsRecoveryMode(
        event === 'PASSWORD_RECOVERY' ||
          new URLSearchParams(window.location.search).get('mode') === 'reset-password',
      );

      if (!nextSession?.user) {
        setProfile(null);
        setProfileLoading(false);
        setAuthLoading(false);
        return;
      }

      void (async () => {
        if (mounted) {
          setAuthLoading(false);
        }

        await loadProfileForUser(nextSession.user);
      })();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [handleAuthFailure, loadProfileForUser]);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw error;
    }

    clearAuthState();
  }, [clearAuthState]);

  const isAdmin =
    user?.app_metadata?.role === 'admin' ||
    user?.user_metadata?.role === 'admin' ||
    user?.user_metadata?.is_admin === true;

  const value = useMemo(
    () => ({
      user,
      session,
      profile,
      authLoading,
      profileLoading,
      isRecoveryMode,
      isAdmin,
      refreshProfile,
      signOut,
    }),
    [authLoading, isAdmin, isRecoveryMode, profile, profileLoading, refreshProfile, session, signOut, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider.');
  }

  return context;
}
