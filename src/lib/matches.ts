import { supabase } from './supabaseClient';
import type {
  Sprint3LeaderboardEntry,
  Sprint3MatchRecord,
  Sprint3PredictionRecord,
  Sprint3PredictionWithMatchRecord,
} from './types';

function cravou() {
  return supabase.schema('cravou');
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

  const { data, error } = await cravou()
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
      `,
    )
    .eq('user_id', userId);

  if (error) {
    throw error;
  }

  return ((data as unknown as (Sprint3PredictionRecord & { matches: Sprint3MatchRecord[] })[] | null) ?? []).map(
    (prediction) => ({
      ...prediction,
      matches: prediction.matches[0],
    }),
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
    nome: user.nome ?? 'Sem nome',
    departamento: user.departamento,
    total_points: totals[user.id] ?? 0,
  })) as Sprint3LeaderboardEntry[]).sort((first, second) => {
    if (second.total_points !== first.total_points) {
      return second.total_points - first.total_points;
    }

    return first.nome.localeCompare(second.nome, 'pt-BR');
  });
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
