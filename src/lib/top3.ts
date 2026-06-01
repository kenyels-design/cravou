import { supabaseCravou } from './supabaseClient';
import type {
  FinalResultRecord,
  TeamRecord,
  Top3PredictionRecord,
  Top3Selection,
  Top3SettingsRecord,
} from './types';

const LOCK_SETTING_KEY = 'top3_predictions_lock_at';

function getPredictionLockTimestamp(settings: Top3SettingsRecord[]) {
  return settings.find((item) => item.setting_key === LOCK_SETTING_KEY)?.setting_value_text ?? null;
}

export function isTop3PredictionWindowOpen(lockAt: string | null) {
  if (!lockAt) {
    return true;
  }

  return new Date(lockAt).getTime() > Date.now();
}

export function getTop3DuplicateError(selection: Top3Selection) {
  const picks = [
    selection.championTeamId,
    selection.viceTeamId,
    selection.thirdPlaceTeamId,
  ].filter(Boolean);

  return new Set(picks).size !== picks.length
    ? 'Campeao, vice e terceiro lugar precisam ser selecoes diferentes.'
    : null;
}

export async function fetchTop3BetPage(userId: string) {
  const [{ data: teams, error: teamsError }, { data: prediction, error: predictionError }, { data: settings, error: settingsError }] =
    await Promise.all([
      supabaseCravou
        .from('teams')
        .select('id, name, fifa_code, flag_emoji, is_active, display_order')
        .eq('is_active', true)
        .order('display_order', { ascending: true })
        .order('name', { ascending: true }),
      supabaseCravou
        .from('top3_predictions')
        .select('id, user_id, champion_team_id, vice_team_id, third_place_team_id, created_at, updated_at')
        .eq('user_id', userId)
        .maybeSingle(),
      supabaseCravou.from('settings').select('setting_key, setting_value_text').eq('setting_key', LOCK_SETTING_KEY),
    ]);

  if (teamsError) {
    throw teamsError;
  }

  if (predictionError) {
    throw predictionError;
  }

  if (settingsError) {
    throw settingsError;
  }

  const lockAt = getPredictionLockTimestamp((settings as Top3SettingsRecord[] | null) ?? []);

  return {
    teams: (teams as TeamRecord[] | null) ?? [],
    prediction: (prediction as Top3PredictionRecord | null) ?? null,
    lockAt,
    isOpen: isTop3PredictionWindowOpen(lockAt),
  };
}

export async function saveTop3Prediction(userId: string, selection: Top3Selection) {
  const duplicateError = getTop3DuplicateError(selection);

  if (duplicateError) {
    throw new Error(duplicateError);
  }

  const payload = {
    user_id: userId,
    champion_team_id: Number(selection.championTeamId),
    vice_team_id: Number(selection.viceTeamId),
    third_place_team_id: Number(selection.thirdPlaceTeamId),
  };

  const { data, error } = await supabaseCravou
    .from('top3_predictions')
    .upsert(payload, {
      onConflict: 'user_id',
    })
    .select('id, user_id, champion_team_id, vice_team_id, third_place_team_id, created_at, updated_at')
    .single();

  if (error) {
    throw error;
  }

  return data as Top3PredictionRecord;
}

export async function fetchTop3ResultPage() {
  const [{ data: teams, error: teamsError }, { data: result, error: resultError }, { data: settings, error: settingsError }] =
    await Promise.all([
      supabaseCravou
        .from('teams')
        .select('id, name, fifa_code, flag_emoji, is_active, display_order')
        .eq('is_active', true)
        .order('display_order', { ascending: true })
        .order('name', { ascending: true }),
      supabaseCravou
        .from('final_result')
        .select('id, champion_team_id, vice_team_id, third_place_team_id, updated_at, updated_by')
        .maybeSingle(),
      supabaseCravou.from('settings').select('setting_key, setting_value_text').eq('setting_key', LOCK_SETTING_KEY),
    ]);

  if (teamsError) {
    throw teamsError;
  }

  if (resultError) {
    throw resultError;
  }

  if (settingsError) {
    throw settingsError;
  }

  const lockAt = getPredictionLockTimestamp((settings as Top3SettingsRecord[] | null) ?? []);

  return {
    teams: (teams as TeamRecord[] | null) ?? [],
    result: (result as FinalResultRecord | null) ?? null,
    lockAt,
    isOpen: isTop3PredictionWindowOpen(lockAt),
  };
}

export function isMissingTop3SchemaError(error: unknown) {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const message = 'message' in error ? String(error.message ?? '').toLowerCase() : '';

  return (
    message.includes('relation') ||
    message.includes('does not exist') ||
    message.includes('could not find') ||
    message.includes('schema cache')
  );
}
