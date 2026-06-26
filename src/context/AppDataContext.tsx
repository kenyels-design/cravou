import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from './AuthContext';
import {
  getCurrentRoundTop5,
  getLeaderboard,
  getMatches,
  getMyPredictions,
  getRecentPredictionActivity,
  getRecentRankingMovements,
} from '../lib/matches';
import type {
  Sprint3CurrentRoundTopEntry,
  Sprint3LeaderboardEntry,
  Sprint3MatchRecord,
  Sprint3PredictionActivity,
  Sprint3PredictionWithMatchRecord,
  Sprint3RankingMovementActivity,
} from '../lib/types';

interface AppDataContextValue {
  matches: Sprint3MatchRecord[];
  predictions: Sprint3PredictionWithMatchRecord[];
  leaderboard: Sprint3LeaderboardEntry[];
  currentRoundTopFive: Sprint3CurrentRoundTopEntry[];
  predictionActivity: Sprint3PredictionActivity[];
  rankingMovements: Sprint3RankingMovementActivity[];
  isInitialLoading: boolean;
  isRefetching: boolean;
  errorMessage: string | null;
  refetchAll: () => Promise<void>;
}

const AppDataContext = createContext<AppDataContextValue | undefined>(undefined);

function errorToMessage(error: unknown) {
  return error && typeof error === 'object' && 'message' in error
    ? String(error.message)
    : 'Nao foi possivel atualizar os dados agora.';
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [matches, setMatches] = useState<Sprint3MatchRecord[]>([]);
  const [predictions, setPredictions] = useState<Sprint3PredictionWithMatchRecord[]>([]);
  const [leaderboard, setLeaderboard] = useState<Sprint3LeaderboardEntry[]>([]);
  const [currentRoundTopFive, setCurrentRoundTopFive] = useState<Sprint3CurrentRoundTopEntry[]>([]);
  const [predictionActivity, setPredictionActivity] = useState<Sprint3PredictionActivity[]>([]);
  const [rankingMovements, setRankingMovements] = useState<Sprint3RankingMovementActivity[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const [isRefetching, setIsRefetching] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasFetchedOnce, setHasFetchedOnce] = useState(false);
  const currentUserIdRef = useRef<string | null>(null);
  const requestIdRef = useRef(0);

  const clearData = useCallback(() => {
    requestIdRef.current += 1;
    setMatches([]);
    setPredictions([]);
    setLeaderboard([]);
    setCurrentRoundTopFive([]);
    setPredictionActivity([]);
    setRankingMovements([]);
    setErrorMessage(null);
    setHasFetchedOnce(false);
    setIsInitialLoading(false);
    setIsRefetching(false);
  }, []);

  const refetchAll = useCallback(async (options?: { initial?: boolean }) => {
    if (!userId) {
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    const shouldShowInitialLoading = options?.initial ?? !hasFetchedOnce;

    if (shouldShowInitialLoading) {
      setIsInitialLoading(true);
    } else {
      setIsRefetching(true);
    }

    setErrorMessage(null);

    try {
      const [matchRows, predictionRows, leaderboardRows, activityRows, movementRows, roundTopRows] = await Promise.all([
        getMatches(),
        getMyPredictions(),
        getLeaderboard(),
        getRecentPredictionActivity(10),
        getRecentRankingMovements(10),
        getCurrentRoundTop5(),
      ]);

      if (requestIdRef.current !== requestId) {
        return;
      }

      setMatches(matchRows);
      setPredictions(predictionRows);
      setLeaderboard(leaderboardRows);
      setPredictionActivity(activityRows);
      setRankingMovements(movementRows);
      setCurrentRoundTopFive(roundTopRows);
    } catch (error) {
      if (requestIdRef.current === requestId) {
        setErrorMessage(errorToMessage(error));
      }
    } finally {
      if (requestIdRef.current === requestId) {
        setHasFetchedOnce(true);
        setIsInitialLoading(false);
        setIsRefetching(false);
      }
    }
  }, [hasFetchedOnce, userId]);

  useEffect(() => {
    if (!userId) {
      currentUserIdRef.current = null;
      clearData();
      return;
    }

    if (currentUserIdRef.current !== userId) {
      currentUserIdRef.current = userId;
      clearData();
      void refetchAll({ initial: true });
    }
  }, [clearData, refetchAll, userId]);

  const value = useMemo<AppDataContextValue>(
    () => ({
      matches,
      predictions,
      leaderboard,
      currentRoundTopFive,
      predictionActivity,
      rankingMovements,
      isInitialLoading,
      isRefetching,
      errorMessage,
      refetchAll,
    }),
    [
      currentRoundTopFive,
      errorMessage,
      isInitialLoading,
      isRefetching,
      leaderboard,
      matches,
      predictionActivity,
      predictions,
      rankingMovements,
      refetchAll,
    ],
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const context = useContext(AppDataContext);

  if (!context) {
    throw new Error('useAppData deve ser usado dentro de AppDataProvider.');
  }

  return context;
}
