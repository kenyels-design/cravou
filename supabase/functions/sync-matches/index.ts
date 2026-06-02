import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

type SyncMode = 'scheduled' | 'daily';
type MatchStatus = 'pendente' | 'ao_vivo' | 'finalizado' | 'aguardando_resultado';

type ApiFixture = {
  fixture?: {
    id?: number;
    status?: {
      short?: string;
    };
  };
  goals?: {
    home?: number | null;
    away?: number | null;
  };
};

type DbMatch = {
  id: string;
  api_fixture_id: number | null;
  match_time: string;
  status: MatchStatus;
  home_score: number | null;
  away_score: number | null;
  last_synced_at: string | null;
};

const RAPIDAPI_HOST = 'api-football-v1.p.rapidapi.com';
const API_BASE_URL = `https://${RAPIDAPI_HOST}/v3/fixtures`;
const MATCH_DURATION_BUFFER_MINUTES = 130;
const SYNC_COOLDOWN_HOURS = 2;

function log(scope: string, details: unknown) {
  console.log(`[sync-matches] ${scope}`, details);
}

function jsonResponse(payload: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

function isCronRequest(request: Request) {
  const cronHeader = request.headers.get('x-supabase-cron');
  const authHeader = request.headers.get('authorization');
  const cronSecret = Deno.env.get('CRON_SECRET');

  if (cronHeader && cronHeader.toLowerCase() === 'true') {
    return true;
  }

  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return true;
  }

  return false;
}

function getMode(request: Request): SyncMode | null {
  const url = new URL(request.url);
  const mode = url.searchParams.get('mode');

  if (mode === 'scheduled' || mode === 'daily') {
    return mode;
  }

  return null;
}

function mapStatus(shortStatus: string | undefined): MatchStatus {
  if (!shortStatus) {
    return 'aguardando_resultado';
  }

  if (shortStatus === 'NS') {
    return 'pendente';
  }

  if (['1H', 'HT', '2H', 'ET', 'BT', 'P', 'LIVE'].includes(shortStatus)) {
    return 'ao_vivo';
  }

  if (['FT', 'AET', 'PEN'].includes(shortStatus)) {
    return 'finalizado';
  }

  if (['PST', 'CANC', 'ABD'].includes(shortStatus)) {
    return 'aguardando_resultado';
  }

  return 'aguardando_resultado';
}

function isScheduledCandidate(match: DbMatch, now: Date) {
  if (match.status === 'finalizado') {
    return false;
  }

  const matchTime = new Date(match.match_time);
  const threshold = new Date(matchTime.getTime() + MATCH_DURATION_BUFFER_MINUTES * 60 * 1000);

  if (threshold > now) {
    return false;
  }

  if (!match.last_synced_at) {
    return true;
  }

  const lastSyncedAt = new Date(match.last_synced_at);
  const cooldownLimit = new Date(now.getTime() - SYNC_COOLDOWN_HOURS * 60 * 60 * 1000);

  return lastSyncedAt < cooldownLimit;
}

function isDailyCandidate(match: DbMatch, currentUtcDate: string) {
  if (match.status === 'finalizado') {
    return false;
  }

  return match.match_time.slice(0, 10) === currentUtcDate;
}

async function fetchFixtureById(fixtureId: number, rapidApiKey: string) {
  const url = new URL(API_BASE_URL);
  url.searchParams.set('id', String(fixtureId));

  const response = await fetch(url, {
    headers: {
      'x-rapidapi-host': RAPIDAPI_HOST,
      'x-rapidapi-key': rapidApiKey,
    },
  });

  if (response.status === 429) {
    return {
      kind: 'rate_limit' as const,
    };
  }

  if (!response.ok) {
    const body = await response.text();
    log('rapidapi-error', { fixtureId, status: response.status, body });
    return {
      kind: 'error' as const,
    };
  }

  const payload = await response.json();
  const fixture = (payload?.response as ApiFixture[] | undefined)?.[0];

  if (!fixture) {
    return {
      kind: 'not_found' as const,
    };
  }

  return {
    kind: 'ok' as const,
    fixture,
  };
}

async function markLastSyncedNow(supabase: ReturnType<typeof createClient>, matchId: string) {
  const { error } = await supabase
    .schema('cravou')
    .from('matches')
    .update({ last_synced_at: new Date().toISOString() })
    .eq('id', matchId);

  if (error) {
    log('last-synced-update-error', { matchId, error });
  }
}

Deno.serve(async (request) => {
  if (!isCronRequest(request)) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  const mode = getMode(request);

  if (!mode) {
    return jsonResponse({ error: 'Invalid mode. Use ?mode=scheduled or ?mode=daily' }, 400);
  }

  const rapidApiKey = Deno.env.get('RAPIDAPI_KEY');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!rapidApiKey || !supabaseUrl || !serviceRoleKey) {
    return jsonResponse(
      {
        error: 'Missing required secrets: RAPIDAPI_KEY, SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY',
      },
      500,
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const now = new Date();
  const currentUtcDate = now.toISOString().slice(0, 10);

  let checked = 0;
  let finalized = 0;
  let errors = 0;

  try {
    const { data, error } = await supabase
      .schema('cravou')
      .from('matches')
      .select('id, api_fixture_id, match_time, status, home_score, away_score, last_synced_at')
      .neq('status', 'finalizado');

    if (error) {
      log('load-matches-error', error);
      return jsonResponse({ checked, finalized, errors: errors + 1 });
    }

    const allMatches = (data as DbMatch[] | null) ?? [];
    const candidates = allMatches.filter((match) =>
      mode === 'scheduled' ? isScheduledCandidate(match, now) : isDailyCandidate(match, currentUtcDate),
    );

    for (const match of candidates) {
      checked += 1;

      if (!match.api_fixture_id) {
        errors += 1;
        log('missing-api-fixture-id', { matchId: match.id });
        continue;
      }

      const apiResult = await fetchFixtureById(match.api_fixture_id, rapidApiKey);

      if (apiResult.kind === 'rate_limit') {
        log('rapidapi-rate-limit', { matchId: match.id, apiFixtureId: match.api_fixture_id });
        await markLastSyncedNow(supabase, match.id);
        continue;
      }

      if (apiResult.kind === 'not_found') {
        errors += 1;
        log('fixture-not-found', { matchId: match.id, apiFixtureId: match.api_fixture_id });
        continue;
      }

      if (apiResult.kind === 'error') {
        errors += 1;
        continue;
      }

      const nextStatus = mapStatus(apiResult.fixture.fixture?.status?.short);
      const nextHomeScore = apiResult.fixture.goals?.home ?? null;
      const nextAwayScore = apiResult.fixture.goals?.away ?? null;

      const { error: updateError } = await supabase
        .schema('cravou')
        .from('matches')
        .update({
          status: nextStatus,
          home_score: nextHomeScore,
          away_score: nextAwayScore,
          last_synced_at: new Date().toISOString(),
        })
        .eq('id', match.id);

      if (updateError) {
        errors += 1;
        log('match-update-error', { matchId: match.id, updateError });
        continue;
      }

      const becameFinalized =
        nextStatus === 'finalizado' &&
        nextHomeScore != null &&
        nextAwayScore != null &&
        match.status !== 'finalizado';

      if (becameFinalized) {
        finalized += 1;

        const { error: rpcError } = await supabase.schema('cravou').rpc('calcular_pontos', {
          p_match_id: match.id,
        });

        if (rpcError) {
          errors += 1;
          log('calculate-points-error', { matchId: match.id, rpcError });
        }
      }
    }

    return jsonResponse({ checked, finalized, errors });
  } catch (unexpectedError) {
    log('unexpected-error', unexpectedError);
    return jsonResponse({ checked, finalized, errors: errors + 1 });
  }
});
