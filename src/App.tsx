import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import BottomNavigation from './components/BottomNavigation';
import ProtectedRoute from './routes/ProtectedRoute';
import ForgotPassword from './views/ForgotPassword';
import Login from './views/Login';
import MyBet from './views/MyBet';
import Profile from './views/Profile';
import Register from './views/Register';
import ResetPassword from './views/ResetPassword';
import Result from './views/Result';

type PublicRoute = '#login' | '#cadastro' | '#esqueci';
type ProtectedRouteHash = '#aposta' | '#resultado' | '#perfil';
type LegacyRoute = '#dashboard' | '#ranking' | '#admin';
type Route = PublicRoute | ProtectedRouteHash | LegacyRoute;

function resolveRoute(): Route {
  const hash = window.location.hash as Route;

  if (!hash) {
    return '#login';
  }

  if (
    [
      '#login',
      '#cadastro',
      '#esqueci',
      '#aposta',
      '#resultado',
      '#perfil',
      '#dashboard',
      '#ranking',
      '#admin',
    ].includes(hash)
  ) {
    return hash;
  }

  return '#login';
}

function normalizeRoute(route: Route): PublicRoute | ProtectedRouteHash {
  if (route === '#dashboard' || route === '#admin') {
    return '#aposta';
  }

  if (route === '#ranking') {
    return '#resultado';
  }

  return route;
}

function AppRouter() {
  const [currentRoute, setCurrentRoute] = useState<Route>(resolveRoute());
  const { authLoading, profile, profileLoading, user } = useAuth();
  const normalizedRoute = normalizeRoute(currentRoute);

  useEffect(() => {
    const handleRouteChange = () => {
      setCurrentRoute(resolveRoute());
    };

    window.addEventListener('hashchange', handleRouteChange);
    window.addEventListener('popstate', handleRouteChange);

    return () => {
      window.removeEventListener('hashchange', handleRouteChange);
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, []);

  useEffect(() => {
    if (currentRoute !== normalizedRoute) {
      window.location.hash = normalizedRoute;
    }
  }, [currentRoute, normalizedRoute]);

  useEffect(() => {
    if (authLoading || (user && profileLoading)) {
      return;
    }

    if (new URLSearchParams(window.location.search).get('mode') === 'reset-password') {
      return;
    }

    if (user && profile && ['#login', '#cadastro', '#esqueci'].includes(normalizedRoute)) {
      window.location.hash = '#aposta';
      return;
    }

    if (!user && ['#aposta', '#resultado', '#perfil'].includes(normalizedRoute)) {
      window.location.hash = '#login';
    }
  }, [authLoading, normalizedRoute, profile, profileLoading, user]);

  const isResetPassword = new URLSearchParams(window.location.search).get('mode') === 'reset-password';

  if (isResetPassword) {
    return <ResetPassword />;
  }

  if (authLoading || (user && profileLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 text-white">
        <div className="rounded-bento border border-white/10 bg-white/5 px-8 py-7 text-center shadow-glow-primary backdrop-blur-xl">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-white/10 border-t-primary" />
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
            {user ? 'Sincronizando perfil' : 'Autenticando'}
          </p>
        </div>
      </div>
    );
  }

  if (normalizedRoute === '#login') {
    return <Login />;
  }

  if (normalizedRoute === '#cadastro') {
    return <Register />;
  }

  if (normalizedRoute === '#esqueci') {
    return <ForgotPassword />;
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background text-white">
        {normalizedRoute === '#aposta' ? <MyBet /> : null}
        {normalizedRoute === '#resultado' ? <Result /> : null}
        {normalizedRoute === '#perfil' ? <Profile /> : null}
        <BottomNavigation currentRoute={normalizedRoute} />
      </div>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppRouter />
      </ToastProvider>
    </AuthProvider>
  );
}
