import { BadRequestException } from '@nestjs/common';
import { USER_REQUESTED_AREA_MAX_LENGTH } from '../common/field-limits';

export const NAME_REGEX = /^[A-Za-zÁÉÍÓÚáéíóúÜüÑñ]+(?: [A-Za-zÁÉÍÓÚáéíóúÜüÑñ]+)*$/;
export const NAME_MESSAGE = 'Solo se permiten letras y espacios';
export const PHONE_ONLY_REGEX = /^\d+$/;
export const PHONE_ONLY_MESSAGE = 'Solo se permiten hasta 15 números';
export const ADULT_AGE_MESSAGE = 'Debes tener al menos 18 años';
export const MAX_AGE_MESSAGE = 'No se permiten mayores de 85 años';
const LOWERCASE_CONNECTORS = new Set([
  'de',
  'del',
  'la',
  'las',
  'los',
  'y',
  'e',
  'da',
  'das',
  'di',
  'do',
  'dos',
  'van',
  'von',
]);

export const buildMaxLengthMessage = (max: number) => `Máximo ${max} caracteres`;

export const normalizeTextValue = (value: unknown) => {
  if (typeof value !== 'string') {
    return value;
  }
  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized.length > 0 ? normalized : undefined;
};

export const normalizeNullableTextValue = (value: unknown) => {
  if (typeof value !== 'string') {
    return value;
  }
  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized.length > 0 ? normalized : null;
};

export const normalizeOptionalCodeValue = (value: unknown) => {
  if (typeof value !== 'string') {
    return value;
  }
  const normalized = value.trim().toUpperCase();
  return normalized.length > 0 ? normalized : undefined;
};

export const emptyStringToUndefined = (value: unknown) => {
  if (typeof value !== 'string') {
    return value;
  }
  return value.length > 0 ? value : undefined;
};

export const emptyStringToNull = (value: unknown) => {
  if (typeof value !== 'string') {
    return value;
  }
  return value.length > 0 ? value : null;
};

const normalizePersonNameWord = (word: string, index: number) => {
  if (!word) {
    return '';
  }
  const lowercasedWord = word.toLocaleLowerCase('es-MX');
  if (index > 0 && LOWERCASE_CONNECTORS.has(lowercasedWord)) {
    return lowercasedWord;
  }
  return `${lowercasedWord[0]?.toLocaleUpperCase('es-MX') ?? ''}${lowercasedWord.slice(1)}`;
};

export const normalizePersonName = (value?: string | null) => {
  const normalized = value?.replace(/\s+/g, ' ').trim() ?? '';
  if (!normalized) {
    return null;
  }
  return normalized
    .split(' ')
    .filter(Boolean)
    .map(normalizePersonNameWord)
    .join(' ');
};

export const normalizeRequestedAreaNombre = (value?: string | null) => {
  const normalized = value?.trim().replace(/\s+/g, ' ') ?? '';
  if (!normalized) {
    return null;
  }
  if (normalized.length < 2) {
    return null;
  }
  return normalized.slice(0, USER_REQUESTED_AREA_MAX_LENGTH);
};

export const shiftYears = (baseDate: Date, years: number) => {
  const date = new Date(baseDate);
  date.setFullYear(date.getFullYear() - years);
  return date;
};

export const toDateInputValue = (date: Date) => date.toISOString().slice(0, 10);

export const parseDateOnly = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) {
    return null;
  }
  return new Date(Date.UTC(year, month - 1, day));
};

export function assertBirthDateRange(value?: string | null) {
  if (!value) {
    return;
  }

  const birthDate = parseDateOnly(value);
  if (!birthDate) {
    throw new BadRequestException('Fecha de nacimiento inválida');
  }

  const today = new Date();
  const maxBirthDate = parseDateOnly(
    toDateInputValue(shiftYears(today, 18)),
  );
  const minBirthDate = parseDateOnly(
    toDateInputValue(shiftYears(today, 85)),
  );

  if (!maxBirthDate || !minBirthDate) {
    throw new BadRequestException('Fecha de nacimiento inválida');
  }

  if (birthDate > maxBirthDate) {
    throw new BadRequestException(ADULT_AGE_MESSAGE);
  }

  if (birthDate < minBirthDate) {
    throw new BadRequestException(MAX_AGE_MESSAGE);
  }
}
