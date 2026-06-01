import type { User } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';
import type { UserProfile } from './types';

const CAMERITE_DOMAIN = '@camerite.com';
const AUTH_NOTICE_KEY = 'cravou-auth-notice';

export function normalizeCorporateEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isCorporateEmail(email: string) {
  return normalizeCorporateEmail(email).endsWith(CAMERITE_DOMAIN);
}

export function getResetPasswordUrl() {
  const url = new URL(window.location.href);
  url.searchParams.set('mode', 'reset-password');
  url.hash = '';
  return url.toString();
}

export function persistAuthNotice(message: string) {
  window.sessionStorage.setItem(AUTH_NOTICE_KEY, message);
}

export function consumeAuthNotice() {
  const message = window.sessionStorage.getItem(AUTH_NOTICE_KEY);

  if (!message) {
    return null;
  }

  window.sessionStorage.removeItem(AUTH_NOTICE_KEY);
  return message;
}

export function isRefreshTokenError(error: unknown) {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const errorCode = 'code' in error ? String(error.code ?? '') : '';
  const errorMessage = 'message' in error ? String(error.message ?? '').toLowerCase() : '';

  return (
    errorCode === 'refresh_token_already_used' ||
    errorCode === 'refresh_token_not_found' ||
    errorMessage.includes('refresh token') ||
    errorMessage.includes('invalid refresh token')
  );
}

export async function fetchUserProfile(userId: string) {
  const { data, error } = await supabase
    .from('cravou_users')
    .select('id, nome, departamento, pontos_totais')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as UserProfile | null;
}

export async function upsertUserProfile(input: {
  id: string;
  nome: string;
  departamento: string;
}) {
  const payload = {
    id: input.id,
    nome: input.nome.trim(),
    departamento: input.departamento,
  };

  const { error } = await supabase.from('cravou_users').upsert(payload, {
    onConflict: 'id',
  });

  if (error) {
    throw error;
  }
}

export async function syncProfileFromAuthUser(user: User) {
  const nome = typeof user.user_metadata?.nome === 'string' ? user.user_metadata.nome : '';
  const departamento =
    typeof user.user_metadata?.departamento === 'string'
      ? user.user_metadata.departamento
      : '';

  if (!nome || !departamento) {
    return;
  }

  await upsertUserProfile({
    id: user.id,
    nome,
    departamento,
  });
}

export async function syncAndFetchUserProfile(user: User) {
  await syncProfileFromAuthUser(user);
  return fetchUserProfile(user.id);
}
