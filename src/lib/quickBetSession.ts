const QUICK_BET_ACTIVE_KEY = 'quickbet:active';
const QUICK_BET_INDEX_KEY = 'quickbet:index';

type QuickBetActiveSession = {
  matchIds: string[];
};

function getSessionStorage() {
  return typeof window === 'undefined' ? null : window.sessionStorage;
}

export function readQuickBetActive() {
  const storage = getSessionStorage();

  if (!storage) {
    return null;
  }

  try {
    const rawValue = storage.getItem(QUICK_BET_ACTIVE_KEY);

    if (!rawValue) {
      return null;
    }

    const parsed = JSON.parse(rawValue) as Partial<QuickBetActiveSession>;

    return Array.isArray(parsed.matchIds)
      ? {
          matchIds: parsed.matchIds.filter((matchId): matchId is string => typeof matchId === 'string'),
        }
      : null;
  } catch {
    return null;
  }
}

export function saveQuickBetActive(matchIds: string[]) {
  const storage = getSessionStorage();

  if (!storage) {
    return;
  }

  storage.setItem(QUICK_BET_ACTIVE_KEY, JSON.stringify({ matchIds }));
}

export function readQuickBetIndex() {
  const storage = getSessionStorage();

  if (!storage) {
    return null;
  }

  const rawValue = storage.getItem(QUICK_BET_INDEX_KEY);

  if (!rawValue) {
    return null;
  }

  const parsed = Number(rawValue);

  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : null;
}

export function saveQuickBetIndex(index: number) {
  const storage = getSessionStorage();

  if (!storage) {
    return;
  }

  storage.setItem(QUICK_BET_INDEX_KEY, String(Math.max(0, Math.floor(index))));
}

export function clearQuickBetSession() {
  const storage = getSessionStorage();

  if (!storage) {
    return;
  }

  storage.removeItem(QUICK_BET_ACTIVE_KEY);
  storage.removeItem(QUICK_BET_INDEX_KEY);
}
