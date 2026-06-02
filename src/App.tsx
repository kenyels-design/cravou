import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import BottomNavigation from './components/BottomNavigation';
import ProtectedRoute from './routes/ProtectedRoute';
import Admin from './views/Admin';
import ForgotPassword from './views/ForgotPassword';
import Home from './views/Home';
import Login from './views/Login';
import MatchDetail from './views/MatchDetail';
import Matches from './views/Matches';
import MyPredictions from './views/MyPredictions';
import Profile from './views/Profile';
import Ranking from './views/Ranking';
import Register from './views/Register';
import ResetPassword from './views/ResetPassword';

type PublicRoute = '#login' | '#cadastro' | '#esqueci';
type ProtectedRouteHash = '#home' | '#jogos' | '#meus-palpites' | '#ranking' | '#perfil' | '#admin';
type LegacyRoute = '#dashboard' | '#palpites' | '#aposta' | '#resultado';
type MatchRoute = `#match/${string}`;
type Route = PublicRoute | ProtectedRouteHash | LegacyRoute | MatchRoute;

function isMatchRoute(route: string): route is MatchRoute {
  return route.startsWith('#match/');
}

function resolveRoute(): Route {
  const hash = window.location.hash;

  if (!hash) {
    return '#login';
  }

  if (isMatchRoute(hash)) {
    return hash;
  }

  if (
    [
      '#login',
      '#cadastro',
      '#esqueci',
      '#home',
      '#jogos',
      '#meus-palpites',
      '#ranking',
      '#perfil',
      '#admin',
      '#palpites',
      '#aposta',
      '#resultado',
      '#dashboard',
    ].includes(hash)
  ) {
    return hash as Route;
  }

  return '#login';
}

function normalizeRoute(route: Route): PublicRoute | ProtectedRouteHash {
  if (route === '#dashboard') {
    return '#home';
  }

  if (route === '#aposta' || route === '#resultado') {
    return '#jogos';
  }

  if (isMatchRoute(route)) {
    return '#jogos';
  }

  if (route === '#palpites') {
    return '#meus-palpites';
  }

  return route;
}

function AppRouter() {
  const [currentRoute, setCurrentRoute] = useState<Route>(resolveRoute());
  const { authLoading, profile, profileLoading, user } = useAuth();
  const normalizedRoute = normalizeRoute(currentRoute);
  const selectedMatchId = isMatchRoute(currentRoute) ? currentRoute.slice('#match/'.length) : null;

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
    if (!isMatchRoute(currentRoute) && currentRoute !== normalizedRoute) {
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
      window.location.hash = '#home';
      return;
    }

    if (!user && ['#home', '#jogos', '#meus-palpites', '#ranking', '#perfil', '#admin'].includes(normalizedRoute)) {
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
      <div className="min-h-screen bg-[#0A0A0A] text-white">
        {normalizedRoute === '#home' ? <Home /> : null}
        {normalizedRoute === '#jogos' && !selectedMatchId ? <Matches /> : null}
        {selectedMatchId ? <MatchDetail matchId={selectedMatchId} /> : null}
        {normalizedRoute === '#meus-palpites' ? <MyPredictions /> : null}
        {normalizedRoute === '#ranking' ? <Ranking /> : null}
        {normalizedRoute === '#perfil' ? <Profile /> : null}
        {normalizedRoute === '#admin' ? <Admin /> : null}
        <BottomNavigation currentRoute={selectedMatchId ? '#jogos' : normalizedRoute} />
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
