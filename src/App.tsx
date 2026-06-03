import { useEffect, useRef, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
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
  const [displayedRoute, setDisplayedRoute] = useState<Route>(resolveRoute());
  const [isTransitioning, setIsTransitioning] = useState(false);
  const { authLoading, profile, profileLoading, user } = useAuth();
  const normalizedRoute = normalizeRoute(currentRoute);
  const displayedNormalizedRoute = normalizeRoute(displayedRoute);
  const selectedMatchId = isMatchRoute(displayedRoute) ? displayedRoute.slice('#match/'.length) : null;
  const exitTimeoutRef = useRef<number | null>(null);
  const enterTimeoutRef = useRef<number | null>(null);

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
    return () => {
      if (exitTimeoutRef.current != null) {
        window.clearTimeout(exitTimeoutRef.current);
      }

      if (enterTimeoutRef.current != null) {
        window.clearTimeout(enterTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isMatchRoute(currentRoute) && currentRoute !== normalizedRoute) {
      window.location.hash = normalizedRoute;
    }
  }, [currentRoute, normalizedRoute]);

  useEffect(() => {
    if (currentRoute === displayedRoute) {
      return;
    }

    if (exitTimeoutRef.current != null) {
      window.clearTimeout(exitTimeoutRef.current);
    }

    if (enterTimeoutRef.current != null) {
      window.clearTimeout(enterTimeoutRef.current);
    }

    setIsTransitioning(true);

    exitTimeoutRef.current = window.setTimeout(() => {
      setDisplayedRoute(currentRoute);

      enterTimeoutRef.current = window.setTimeout(() => {
        setIsTransitioning(false);
      }, 200);
    }, 150);
  }, [currentRoute, displayedRoute]);

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
      <div className="flex min-h-screen items-center justify-center bg-[#F5F5F5] px-4 text-[#0A0A0A] dark:bg-background dark:text-white">
        <div className="rounded-bento border border-[#E0E0E0] bg-white px-8 py-7 text-center shadow-glow-primary dark:border-white/10 dark:bg-white/5 dark:backdrop-blur-xl">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-[#E0E0E0] border-t-primary dark:border-white/10" />
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
            {user ? 'Sincronizando perfil' : 'Autenticando'}
          </p>
        </div>
      </div>
    );
  }

  if (displayedNormalizedRoute === '#login') {
    return <Login />;
  }

  if (displayedNormalizedRoute === '#cadastro') {
    return <Register />;
  }

  if (displayedNormalizedRoute === '#esqueci') {
    return <ForgotPassword />;
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#F5F5F5] pt-0 text-[#0A0A0A] dark:bg-[#0A0A0A] dark:text-white md:pt-20">
        <div
          className={`transition-all duration-200 ease-out ${
            isTransitioning ? 'translate-y-2 opacity-0' : 'translate-y-0 opacity-100'
          }`}
        >
          {displayedNormalizedRoute === '#home' ? <Home /> : null}
          {displayedNormalizedRoute === '#jogos' && !selectedMatchId ? <Matches /> : null}
          {selectedMatchId ? <MatchDetail matchId={selectedMatchId} /> : null}
          {displayedNormalizedRoute === '#meus-palpites' ? <MyPredictions /> : null}
          {displayedNormalizedRoute === '#ranking' ? <Ranking /> : null}
          {displayedNormalizedRoute === '#perfil' ? <Profile /> : null}
          {displayedNormalizedRoute === '#admin' ? <Admin /> : null}
        </div>
        <BottomNavigation currentRoute={selectedMatchId ? '#jogos' : displayedNormalizedRoute} />
      </div>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <AppRouter />
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
