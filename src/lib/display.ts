import { DEPARTMENTS } from './types';

const REGIONAL_INDICATOR_A = 0x1f1e6;

const DEPARTMENT_ALIASES: Record<string, string> = {
  financeiro: 'Financeiro',
  administrativo: 'Administrativo',
  governo: 'Governo',
  desenvolvimento: 'Desenvolvimento',
  suporte: 'Suporte',
  comercial: 'Comercial',
  'franquias/canais': 'Franquias/Canais',
  marketing: 'Marketing',
  operacoes: 'Administrativo',
  ti: 'Desenvolvimento',
};

function normalizeText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function countryCodeToFlag(code: string) {
  const normalizedCode = code.trim().toUpperCase();

  if (!/^[A-Z]{2}$/.test(normalizedCode)) {
    return code;
  }

  return Array.from(normalizedCode)
    .map((char) => String.fromCodePoint(REGIONAL_INDICATOR_A + char.charCodeAt(0) - 65))
    .join('');
}

export function getFlagLabel(flag: string | null, fallback: string) {
  if (!flag) {
    return fallback;
  }

  if (/^https?:\/\//i.test(flag)) {
    return flag;
  }

  if (/^[A-Za-z]{2}$/.test(flag.trim())) {
    return countryCodeToFlag(flag);
  }

  return flag;
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
