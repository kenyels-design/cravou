import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

type MatchStatus = 'pendente' | 'ao_vivo' | 'finalizado' | 'aguardando_resultado';

type WorldCupMatch = {
  team1?: string;
  team2?: string;
  score?: {
    ft?: [number, number] | number[];
  };
};

type WorldCupPayload = {
  matches?: WorldCupMatch[];
};

type DbMatch = {
  id: string;
  home_team: string;
  away_team: string;
  status: MatchStatus;
};

const DATA_SOURCE_URL =
  'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json';

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

function hasFinalScore(match: WorldCupMatch) {
  return (
    Array.isArray(match.score?.ft) &&
    match.score.ft.length >= 2 &&
    typeof match.score.ft[0] === 'number' &&
    typeof match.score.ft[1] === 'number'
  );
}

Deno.serve(async (_req) => {
  try {
    console.log('Iniciando sync...');
    console.log('SUPABASE_URL:', Deno.env.get('SUPABASE_URL'));
    console.log('SERVICE_KEY present:', !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse(
        {
          error: 'Missing required secrets: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY',
        },
        500,
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    let checked = 0;
    let updated = 0;
    let errors = 0;
    let unmatched = 0;
    let skipped = 0;

    console.log('Buscando worldcup.json...');
    const sourceResponse = await fetch(DATA_SOURCE_URL);
    console.log('Status fetch:', sourceResponse.status);

    if (!sourceResponse.ok) {
      const body = await sourceResponse.text();
      log('source-fetch-error', { status: sourceResponse.status, body });
      return jsonResponse({ updated, skipped: skipped + 1, checked, unmatched, errors: errors + 1 }, 502);
    }

    const sourcePayload = (await sourceResponse.json()) as WorldCupPayload;
    console.log('Total matches na API:', sourcePayload.matches?.length ?? 0);
    const finalizedMatches = (sourcePayload.matches ?? []).filter(hasFinalScore);

    for (const sourceMatch of finalizedMatches) {
      checked += 1;
      console.log('Jogo com resultado:', sourceMatch.team1, 'x', sourceMatch.team2, sourceMatch.score?.ft);

      if (!sourceMatch.team1 || !sourceMatch.team2 || !hasFinalScore(sourceMatch)) {
        errors += 1;
        skipped += 1;
        log('invalid-source-match', sourceMatch);
        continue;
      }

      const { data: matchRows, error: rpcError } = await supabase.schema('cravou').rpc('match_by_english_name', {
        p_home: sourceMatch.team1,
        p_away: sourceMatch.team2,
      });

      if (rpcError) {
        console.error('[sync-matches] rpc-error', rpcError);
        errors += 1;
        skipped += 1;
        continue;
      }

      if (!matchRows || matchRows.length === 0) {
        unmatched += 1;
        skipped += 1;
        console.log('[sync-matches] match-not-found', sourceMatch.team1, 'x', sourceMatch.team2);
        continue;
      }

      const match = matchRows[0] as DbMatch;

      if (match.status === 'finalizado') {
        skipped += 1;
        continue;
      }

      const [homeScore, awayScore] = sourceMatch.score.ft as [number, number];
      console.log('Atualizando:', sourceMatch.team1, 'x', sourceMatch.team2, sourceMatch.score.ft);

      const { error: updateError } = await supabase
        .schema('cravou')
        .from('matches')
        .update({
          status: 'finalizado',
          home_score: homeScore,
          away_score: awayScore,
          last_synced_at: new Date().toISOString(),
        })
        .eq('id', match.id)
        .neq('status', 'finalizado');

      if (updateError) {
        errors += 1;
        skipped += 1;
        log('match-update-error', { matchId: match.id, updateError });
        continue;
      }

      const { error: calculatePointsError } = await supabase.schema('cravou').rpc('calcular_pontos', {
        p_match_id: match.id,
      });

      if (calculatePointsError) {
        errors += 1;
        skipped += 1;
        log('calculate-points-error', { matchId: match.id, rpcError: calculatePointsError });
        continue;
      }

      updated += 1;
    }

    log('updated-matches-count', { updated, checked, unmatched });

    return new Response(
      JSON.stringify({
        updated,
        skipped,
        checked,
        unmatched,
        errors,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
  } catch (err) {
    console.error('ERRO:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
});
