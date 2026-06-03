import { supabase } from './supabaseClient';
import type {
  Sprint3LeaderboardEntry,
  Sprint3PredictionActivity,
  Sprint3RankingMovementActivity,
  Sprint3MatchRecord,
  Sprint3PredictionRecord,
  Sprint3PredictionWithMatchRecord,
} from './types';

function cravou() {
  return supabase.schema('cravou');
}

function getUserDisplayName(user: { nome?: string | null; email?: string | null } | null | undefined) {
  const nome = user?.nome?.trim();

  if (nome) {
    return nome;
  }

  const emailLocalPart = user?.email?.split('@')[0]?.trim();

  if (emailLocalPart) {
    return emailLocalPart;
  }

  return 'Usuario';
}

async function getCurrentUserId() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  if (!user) {
    throw new Error('Usuario nao autenticado.');
  }

  return user.id;
}

export async function getMatches() {
  const { data, error } = await cravou()
    .from('matches')
    .select(
      'id, home_team, away_team, home_flag, away_flag, match_time, round, group_name, status, home_score, away_score, created_at, updated_at',
    )
    .order('match_time', { ascending: true });

  if (error) {
    throw error;
  }

  return (data as Sprint3MatchRecord[] | null) ?? [];
}

export async function getUserPredictionStats(userId: string) {
  const { data, error } = await cravou().from('predictions').select('points').eq('user_id', userId);

  if (error) {
    throw error;
  }

  const rows = (data as Array<{ points: number | null }> | null) ?? [];

  return rows.reduce(
    (stats, row) => ({
      totalPoints: stats.totalPoints + (row.points ?? 0),
      predictionCount: stats.predictionCount + 1,
    }),
    {
      totalPoints: 0,
      predictionCount: 0,
    },
  );
}

export async function upsertPrediction(matchId: string, homeScore: number, awayScore: number) {
  const userId = await getCurrentUserId();

  const { data, error } = await cravou()
    .from('predictions')
    .upsert(
      {
        user_id: userId,
        match_id: matchId,
        home_score: homeScore,
        away_score: awayScore,
      },
      {
        onConflict: 'user_id,match_id',
      },
    )
    .select('id, user_id, match_id, home_score, away_score, points, created_at, updated_at')
    .single();

  if (error) {
    throw error;
  }

  return data as Sprint3PredictionRecord;
}

export async function getMyPredictions() {
  const userId = await getCurrentUserId();
  const predictionSelectQuery = `
        id,
        user_id,
        match_id,
        home_score,
        away_score,
        points,
        created_at,
        updated_at,
        matches:matches!inner(
          id,
          home_team,
          away_team,
          home_flag,
          away_flag,
          match_time,
          round,
          group_name,
          status,
          home_score,
          away_score,
          created_at,
          updated_at
        )
      `;

  console.log('[getMyPredictions] query', {
    schema: 'cravou',
    table: 'predictions',
    filter: { user_id: userId },
    select: predictionSelectQuery,
  });

  const { data, error } = await cravou()
    .from('predictions')
    .select(predictionSelectQuery)
    .eq('user_id', userId);

  console.log('[getMyPredictions] response', {
    userId,
    error,
    data,
  });

  if (error) {
    throw error;
  }

  return (
    ((data as unknown as
      | (Sprint3PredictionRecord & {
          matches: Sprint3MatchRecord | Sprint3MatchRecord[] | null;
        })[]
      | null) ?? [])
      .map((prediction) => {
        const match = Array.isArray(prediction.matches)
          ? prediction.matches[0] ?? null
          : prediction.matches;

        return match
          ? {
              ...prediction,
              matches: match,
            }
          : null;
      })
      .filter((prediction): prediction is Sprint3PredictionWithMatchRecord => prediction !== null)
  );
}

export async function getLeaderboard() {
  const [{ data: users, error: usersError }, { data: predictions, error: predictionsError }] = await Promise.all([
    supabase.from('cravou_users').select('id, nome, departamento'),
    cravou().from('predictions').select('user_id, points'),
  ]);

  if (usersError) {
    throw usersError;
  }

  if (predictionsError) {
    throw predictionsError;
  }

  const totals = ((predictions as Pick<Sprint3PredictionRecord, 'user_id' | 'points'>[] | null) ?? []).reduce<
    Record<string, number>
  >((accumulator, prediction) => {
    accumulator[prediction.user_id] = (accumulator[prediction.user_id] ?? 0) + (prediction.points ?? 0);
    return accumulator;
  }, {});

  return (((users as { id: string; nome: string | null; departamento: string | null }[] | null) ?? []).map((user) => ({
    user_id: user.id,
    nome: getUserDisplayName(user),
    departamento: user.departamento,
    total_points: totals[user.id] ?? 0,
  })) as Sprint3LeaderboardEntry[]).sort((first, second) => {
    if (second.total_points !== first.total_points) {
      return second.total_points - first.total_points;
    }

    return first.nome.localeCompare(second.nome, 'pt-BR');
  });
}

export async function getRecentPredictionActivity(limit = 5) {
  const { data: predictions, error: predictionsError } = await cravou()
    .from('predictions')
    .select(
      `
        id,
        user_id,
        match_id,
        home_score,
        away_score,
        points,
        created_at,
        updated_at,
        matches:matches!inner(
          id,
          home_team,
          away_team
        )
      `,
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  if (predictionsError) {
    throw predictionsError;
  }

  const userIds = Array.from(
    new Set(
      ((((predictions as unknown as Array<Pick<Sprint3PredictionRecord, 'user_id'>> | null) ?? []).map((prediction) => prediction.user_id))
        .filter((userId): userId is string => Boolean(userId))),
    ),
  );

  const { data: users, error: usersError } = userIds.length
    ? await supabase.from('cravou_users').select('id, nome').in('id', userIds)
    : { data: [], error: null };

  if (usersError) {
    throw usersError;
  }

  const namesById = (((users as { id: string; nome: string | null }[] | null) ?? []).reduce<Record<string, string>>(
    (accumulator, user) => {
      accumulator[user.id] = getUserDisplayName(user);
      return accumulator;
    },
    {},
  ));

  return (
    ((predictions as unknown as
      | (Sprint3PredictionRecord & {
          matches:
            | Pick<Sprint3MatchRecord, 'id' | 'home_team' | 'away_team'>
            | Array<Pick<Sprint3MatchRecord, 'id' | 'home_team' | 'away_team'>>;
        })[]
      | null) ?? [])
      .map((prediction) => {
        const match = Array.isArray(prediction.matches)
          ? prediction.matches[0] ?? null
          : prediction.matches;

        return {
          prediction_id: prediction.id,
          created_at: prediction.created_at,
          updated_at: prediction.updated_at,
          user_id: prediction.user_id,
          user_name: namesById[prediction.user_id] ?? getUserDisplayName(null),
          match_id: prediction.match_id,
          match_label: `${match?.home_team ?? 'Time A'} x ${match?.away_team ?? 'Time B'}`,
          home_score: prediction.home_score,
          away_score: prediction.away_score,
          points: prediction.points,
        };
      }) as Sprint3PredictionActivity[]
  );
}

export async function getRecentRankingMovements(limit = 10) {
  const [{ data: predictions, error: predictionsError }, { data: users, error: usersError }] = await Promise.all([
    cravou()
      .from('predictions')
      .select('id, user_id, points, updated_at')
      .not('points', 'is', null)
      .gt('points', 0)
      .order('updated_at', { ascending: false })
      .limit(limit),
    supabase.from('cravou_users').select('id, nome'),
  ]);

  if (predictionsError) {
    throw predictionsError;
  }

  if (usersError) {
    throw usersError;
  }

  const namesById = (((users as { id: string; nome: string | null }[] | null) ?? []).reduce<Record<string, string>>(
    (accumulator, user) => {
      accumulator[user.id] = getUserDisplayName(user);
      return accumulator;
    },
    {},
  ));

  return (((predictions as Array<Pick<Sprint3PredictionRecord, 'id' | 'user_id' | 'points' | 'updated_at'>> | null) ?? [])
    .map((prediction) => ({
      prediction_id: prediction.id,
      user_id: prediction.user_id,
      user_name: namesById[prediction.user_id] ?? getUserDisplayName(null),
      points: prediction.points ?? 0,
      updated_at: prediction.updated_at,
    })) as Sprint3RankingMovementActivity[]);
}

export async function createMatch(input: {
  home_team: string;
  away_team: string;
  home_flag: string | null;
  away_flag: string | null;
  match_time: string;
  round: string;
  group_name: string | null;
  status: Sprint3MatchRecord['status'];
}) {
  const { data, error } = await cravou()
    .from('matches')
    .insert(input)
    .select(
      'id, home_team, away_team, home_flag, away_flag, match_time, round, group_name, status, home_score, away_score, created_at, updated_at',
    )
    .single();

  if (error) {
    throw error;
  }

  return data as Sprint3MatchRecord;
}

export async function updateMatch(
  matchId: string,
  input: Partial<
    Pick<Sprint3MatchRecord, 'home_team' | 'away_team' | 'home_flag' | 'away_flag' | 'match_time' | 'round' | 'group_name' | 'status'>
  > & {
    home_score?: number | null;
    away_score?: number | null;
  },
) {
  const { data, error } = await cravou()
    .from('matches')
    .update(input)
    .eq('id', matchId)
    .select(
      'id, home_team, away_team, home_flag, away_flag, match_time, round, group_name, status, home_score, away_score, created_at, updated_at',
    )
    .single();

  if (error) {
    throw error;
  }

  return data as Sprint3MatchRecord;
}

export async function calculateMatchPoints(matchId: string) {
  const { error } = await cravou().rpc('calcular_pontos', {
    p_match_id: matchId,
  });

  if (error) {
    throw error;
  }
}

export type { Sprint3PredictionWithMatchRecord };
