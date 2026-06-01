import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

type SyncMode = 'full' | 'live';
type MatchStatus = 'pendente' | 'ao_vivo' | 'finalizado' | 'aguardando_resultado';

type ApiFixture = {
  fixture?: {
    id?: number;
    date?: string;
    status?: {
      short?: string;
    };
  };
  league?: {
    round?: string;
  };
  teams?: {
    home?: {
      name?: string;
      flag?: string;
    };
    away?: {
      name?: string;
      flag?: string;
    };
  };
  goals?: {
    home?: number | null;
    away?: number | null;
  };
};

type ExistingMatch = {
  id: string;
  api_fixture_id: number;
  status: MatchStatus;
  home_score: number | null;
  away_score: number | null;
};

const RAPIDAPI_HOST = 'api-football-v1.p.rapidapi.com';
const API_BASE_URL = `https://${RAPIDAPI_HOST}/v3/fixtures`;

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

function getMode(request: Request): SyncMode {
  const url = new URL(request.url);
  return url.searchParams.get('mode') === 'live' ? 'live' : 'full';
}

function extractGroupName(round: string | undefined) {
  if (!round) {
    return null;
  }

  const match = round.match(/group\s+[a-z]/i);
  return match ? match[0] : null;
}

function mapStatus(shortStatus: string | undefined): MatchStatus {
  if (!shortStatus) {
    return 'aguardando_resultado';
  }

  if (shortStatus === 'NS') {
    return 'pendente';
  }

  if (['1H', 'HT', '2H', 'ET', 'BT', 'P', 'SUSP', 'INT', 'LIVE'].includes(shortStatus)) {
    return 'ao_vivo';
  }

  if (['FT', 'AET', 'PEN'].includes(shortStatus)) {
    return 'finalizado';
  }

  if (['PST', 'CANC', 'ABD', 'AWD', 'WO'].includes(shortStatus)) {
    return 'aguardando_resultado';
  }

  return 'aguardando_resultado';
}

async function fetchFixtures(url: URL, rapidApiKey: string) {
  const response = await fetch(url, {
    headers: {
      'x-rapidapi-host': RAPIDAPI_HOST,
      'x-rapidapi-key': rapidApiKey,
    },
  });

  if (response.status === 429) {
    log('rapidapi-rate-limit', { url: url.toString(), status: response.status });
    return [];
  }

  if (!response.ok) {
    const body = await response.text();
    log('rapidapi-error', { url: url.toString(), status: response.status, body });
    return [];
  }

  const payload = await response.json();
  return (payload?.response as ApiFixture[] | undefined) ?? [];
}

async function getFixtures(mode: SyncMode, rapidApiKey: string) {
  if (mode === 'full') {
    const url = new URL(API_BASE_URL);
    url.searchParams.set('league', '1');
    url.searchParams.set('season', '2026');

    return fetchFixtures(url, rapidApiKey);
  }

  const liveUrl = new URL(API_BASE_URL);
  liveUrl.searchParams.set('league', '1');
  liveUrl.searchParams.set('season', '2026');
  liveUrl.searchParams.set('status', '1H-2H-HT-ET-BT-P');

  const nextUrl = new URL(API_BASE_URL);
  nextUrl.searchParams.set('league', '1');
  nextUrl.searchParams.set('season', '2026');
  nextUrl.searchParams.set('next', '5');

  const [liveFixtures, nextFixtures] = await Promise.all([
    fetchFixtures(liveUrl, rapidApiKey),
    fetchFixtures(nextUrl, rapidApiKey),
  ]);

  const uniqueFixtures = new Map<number, ApiFixture>();

  [...liveFixtures, ...nextFixtures].forEach((fixture) => {
    const fixtureId = fixture.fixture?.id;
    if (fixtureId) {
      uniqueFixtures.set(fixtureId, fixture);
    }
  });

  return [...uniqueFixtures.values()];
}

function toMatchPayload(fixture: ApiFixture) {
  const round = fixture.league?.round ?? 'Rodada indefinida';
  const shortStatus = fixture.fixture?.status?.short;

  return {
    api_fixture_id: fixture.fixture?.id ?? null,
    home_team: fixture.teams?.home?.name ?? 'Mandante indefinido',
    away_team: fixture.teams?.away?.name ?? 'Visitante indefinido',
    home_flag: fixture.teams?.home?.flag ?? null,
    away_flag: fixture.teams?.away?.flag ?? null,
    match_time: fixture.fixture?.date ?? new Date().toISOString(),
    round,
    group_name: round.toLowerCase().includes('group') ? extractGroupName(round) : null,
    status: mapStatus(shortStatus),
    home_score: fixture.goals?.home ?? null,
    away_score: fixture.goals?.away ?? null,
  };
}

Deno.serve(async (request) => {
  if (!isCronRequest(request)) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
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

  const mode = getMode(request);
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  let synced = 0;
  let updated = 0;
  let errors = 0;

  try {
    const fixtures = await getFixtures(mode, rapidApiKey);

    if (fixtures.length === 0) {
      return jsonResponse({ synced, updated, errors });
    }

    const fixtureIds = fixtures
      .map((fixture) => fixture.fixture?.id)
      .filter((fixtureId): fixtureId is number => typeof fixtureId === 'number');

    const { data: existingMatches, error: existingMatchesError } = await supabase
      .schema('cravou')
      .from('matches')
      .select('id, api_fixture_id, status, home_score, away_score')
      .in('api_fixture_id', fixtureIds);

    if (existingMatchesError) {
      log('load-existing-matches-error', existingMatchesError);
      return jsonResponse({ synced, updated, errors: errors + fixtureIds.length });
    }

    const existingByFixtureId = new Map<number, ExistingMatch>();
    ((existingMatches as ExistingMatch[] | null) ?? []).forEach((match) => {
      existingByFixtureId.set(match.api_fixture_id, match);
    });

    for (const fixture of fixtures) {
      try {
        const payload = toMatchPayload(fixture);
        const fixtureId = payload.api_fixture_id;

        if (!fixtureId) {
          errors += 1;
          log('missing-fixture-id', fixture);
          continue;
        }

        const existing = existingByFixtureId.get(fixtureId);

        if (!existing) {
          const { error: insertError } = await supabase.schema('cravou').from('matches').insert(payload);

          if (insertError) {
            errors += 1;
            log('insert-match-error', { fixtureId, insertError });
            continue;
          }

          updated += 1;
          synced += 1;
          continue;
        }

        const changed =
          existing.status !== payload.status ||
          existing.home_score !== payload.home_score ||
          existing.away_score !== payload.away_score;

        if (!changed) {
          synced += 1;
          continue;
        }

        const { data: updatedMatch, error: updateError } = await supabase
          .schema('cravou')
          .from('matches')
          .update({
            status: payload.status,
            home_score: payload.home_score,
            away_score: payload.away_score,
          })
          .eq('id', existing.id)
          .select('id, status, home_score, away_score')
          .single();

        if (updateError) {
          errors += 1;
          log('update-match-error', { fixtureId, updateError });
          continue;
        }

        updated += 1;
        synced += 1;

        const becameFinalized =
          existing.status !== 'finalizado' &&
          updatedMatch?.status === 'finalizado' &&
          updatedMatch?.home_score != null &&
          updatedMatch?.away_score != null;

        if (becameFinalized) {
          const { error: rpcError } = await supabase.schema('cravou').rpc('calcular_pontos', {
            p_match_id: existing.id,
          });

          if (rpcError) {
            errors += 1;
            log('calculate-points-error', { fixtureId, matchId: existing.id, rpcError });
          }
        }
      } catch (fixtureError) {
        errors += 1;
        log('fixture-processing-error', fixtureError);
      }
    }

    return jsonResponse({ synced, updated, errors });
  } catch (unexpectedError) {
    log('unexpected-error', unexpectedError);
    return jsonResponse({ synced, updated, errors: errors + 1 });
  }
});
