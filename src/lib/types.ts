export interface UserProfile {
  id: string;
  nome: string | null;
  departamento: string | null;
  pontos_totais: number | null;
}

export const DEPARTMENTS = [
  'Financeiro/Administrativo',
  'Governo',
  'Desenvolvimento',
  'Comercial/Aquisição',
  'Franquias/Canais/Suporte',
  'Marketing',
] as const;

export type DepartmentName = (typeof DEPARTMENTS)[number];

export type MatchStatus =
  | 'pendente'
  | 'ao_vivo'
  | 'finalizado'
  | 'aguardando_resultado'
  | 'agendado';

export interface MatchRecord {
  id: number;
  time_a: string;
  time_b: string;
  flag_a: string | null;
  flag_b: string | null;
  data_hora: string;
  status: MatchStatus;
  fase: string;
  gols_a?: number | null;
  gols_b?: number | null;
}

export interface PredictionRecord {
  match_id: number;
  palpite_a: number;
  palpite_b: number;
}

export interface TeamRecord {
  id: number;
  name: string;
  fifa_code: string | null;
  flag_emoji: string | null;
  is_active: boolean;
  display_order: number;
}

export interface Top3PredictionRecord {
  id: number;
  user_id: string;
  champion_team_id: number;
  vice_team_id: number;
  third_place_team_id: number;
  created_at: string;
  updated_at: string;
}

export interface FinalResultRecord {
  id: boolean;
  champion_team_id: number | null;
  vice_team_id: number | null;
  third_place_team_id: number | null;
  updated_at: string;
  updated_by: string | null;
}

export interface Top3SettingsRecord {
  setting_key: string;
  setting_value_text: string | null;
}

export interface Top3Selection {
  championTeamId: string;
  viceTeamId: string;
  thirdPlaceTeamId: string;
}

export const FUTURE_TOP3_SCORING_RULES = [
  'Campeao certo: 10 pontos',
  'Vice-campeao certo: 7 pontos',
  'Terceiro lugar certo: 5 pontos',
  'Selecao entre as tres primeiras em posicao errada: 3 pontos',
] as const;

export type Sprint3MatchStatus =
  | 'pendente'
  | 'ao_vivo'
  | 'finalizado'
  | 'aguardando_resultado';

export interface Sprint3MatchRecord {
  id: string;
  home_team: string;
  away_team: string;
  home_flag: string | null;
  away_flag: string | null;
  match_time: string;
  round: string;
  group_name: string | null;
  status: Sprint3MatchStatus;
  home_score: number | null;
  away_score: number | null;
  created_at: string;
  updated_at: string;
}

export interface Sprint3PredictionRecord {
  id: string;
  user_id: string;
  match_id: string;
  home_score: number;
  away_score: number;
  points: number | null;
  created_at: string;
  updated_at: string;
}

export interface Sprint3PredictionWithMatchRecord extends Sprint3PredictionRecord {
  matches: Sprint3MatchRecord;
}

export interface Sprint3LeaderboardEntry {
  user_id: string;
  nome: string;
  departamento: string | null;
  total_points: number;
}

export interface Sprint3CurrentRoundTopEntry {
  user_id: string;
  nome: string;
  departamento: string | null;
  round_points: number;
}

export interface Sprint3PredictionActivity {
  prediction_id: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  user_name: string;
  match_id: string;
  match_label: string;
  home_team: string;
  away_team: string;
  home_score: number;
  away_score: number;
  points: number | null;
}

export interface Sprint3RankingMovementActivity {
  prediction_id: string;
  user_id: string;
  user_name: string;
  points: number;
  updated_at: string;
}
