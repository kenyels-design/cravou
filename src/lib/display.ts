import { DEPARTMENTS } from './types';

const DEPARTMENT_ALIASES: Record<string, string> = {
  financeiro: 'Financeiro/Administrativo',
  administrativo: 'Financeiro/Administrativo',
  'financeiro/administrativo': 'Financeiro/Administrativo',
  governo: 'Governo',
  desenvolvimento: 'Desenvolvimento',
  suporte: 'Franquias/Canais/Suporte',
  comercial: 'Comercial/Aquisição',
  aquisicao: 'Comercial/Aquisição',
  'comercial/aquisicao': 'Comercial/Aquisição',
  franquias: 'Franquias/Canais/Suporte',
  canais: 'Franquias/Canais/Suporte',
  'franquias/canais': 'Franquias/Canais/Suporte',
  'franquias/canais/suporte': 'Franquias/Canais/Suporte',
  marketing: 'Marketing',
  operacoes: 'Financeiro/Administrativo',
  ti: 'Desenvolvimento',
};

function normalizeText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function getFlagCode(flag: string | null) {
  if (!flag) {
    return null;
  }

  const sanitizedFlag = flag.replace(/[\s\u200B-\u200D\uFEFF]/g, '');

  if (!sanitizedFlag || sanitizedFlag === '🏳') {
    return null;
  }

  const normalizedCode = sanitizedFlag.toLowerCase();
  return /^[a-z]{2}$/.test(normalizedCode) ? normalizedCode : null;
}

export function formatMatchKickoff(matchTime: string) {
  const parts = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    hour12: false,
  }).formatToParts(new Date(matchTime));

  const day = parts.find((part) => part.type === 'day')?.value ?? '--';
  const month = (parts.find((part) => part.type === 'month')?.value ?? '')
    .replace('.', '')
    .trim();
  const hour = parts.find((part) => part.type === 'hour')?.value ?? '--';
  const monthLabel = month ? month.charAt(0).toUpperCase() + month.slice(1) : '';

  return `${day} ${monthLabel} · ${hour}h`;
}

export function formatMatchKickoffTime(matchTime: string) {
  const parts = new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    hour12: false,
  }).formatToParts(new Date(matchTime));

  const hour = parts.find((part) => part.type === 'hour')?.value ?? '--';
  return `${hour}h`;
}

export function normalizeDepartmentName(department: string | null) {
  if (!department) {
    return null;
  }

  const normalized = normalizeText(department);
  const alias = DEPARTMENT_ALIASES[normalized];

  if (alias) {
    return alias;
  }

  const officialName = DEPARTMENTS.find((item) => normalizeText(item) === normalized);
  return officialName ?? department;
}
