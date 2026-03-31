import { BadRequestException, HttpStatus } from '@nestjs/common';
import type { ValidationError } from 'class-validator';
import type { Request } from 'express';

export type RequestWithId = Request & { requestId?: string };

export type ApiErrorResponse = {
  statusCode: number;
  error: string;
  message: string;
  errors?: string[];
  code?: string;
  path: string;
  requestId?: string;
  timestamp: string;
};

const VALIDATION_TRANSLATIONS: Array<{ pattern: RegExp; replacement: string }> = [
  {
    pattern: /^(.+?) must be longer than or equal to (\d+) characters$/i,
    replacement: '$1 debe tener al menos $2 caracteres',
  },
  {
    pattern: /^(.+?) must be shorter than or equal to (\d+) characters$/i,
    replacement: '$1 debe tener máximo $2 caracteres',
  },
  {
    pattern: /^(.+?) must be an email$/i,
    replacement: '$1 debe ser un correo válido',
  },
  {
    pattern: /^(.+?) should not be empty$/i,
    replacement: '$1 es obligatorio',
  },
  {
    pattern: /^(.+?) must be a string$/i,
    replacement: '$1 debe ser texto',
  },
  {
    pattern: /^(.+?) must be a boolean value$/i,
    replacement: '$1 debe ser verdadero o falso',
  },
  {
    pattern: /^(.+?) must be an integer number$/i,
    replacement: '$1 debe ser un número entero válido',
  },
  {
    pattern: /^(.+?) must not be less than (\d+)$/i,
    replacement: '$1 debe ser mayor o igual a $2',
  },
  {
    pattern: /^(.+?) must be a number conforming to the specified constraints$/i,
    replacement: '$1 debe ser un número válido',
  },
  {
    pattern: /^(.+?) must be one of the following values: (.+)$/i,
    replacement: '$1 debe ser uno de los siguientes valores: $2',
  },
  {
    pattern: /^property (.+) should not exist$/i,
    replacement: 'No se permite el campo $1',
  },
];

const DIRECT_REPLACEMENTS: Array<[RegExp, string]> = [
  [/Credenciales invalidas/gi, 'Credenciales inválidas'],
  [/Codigo invalido/gi, 'Código inválido'],
  [/Codigo ya existe/gi, 'Código ya existe'],
  [/Codigo expirado/gi, 'Código expirado'],
  [/Bootstrap token invalido/gi, 'Token de bootstrap inválido'],
  [/Categoria/gi, 'Categoría'],
  [/area invalida/gi, 'área inválida'],
  [/Areas no encontradas/gi, 'Áreas no encontradas'],
  [/Areas inválidas/gi, 'Áreas inválidas'],
  [/No autorizado/gi, 'Acción no autorizada'],
  [/verificacion/gi, 'verificación'],
  [/revision/gi, 'revisión'],
  [/aprobacion/gi, 'aprobación'],
  [/super admin/gi, 'superadministrador'],
];

const STATUS_LABELS: Partial<Record<number, string>> = {
  [HttpStatus.BAD_REQUEST]: 'Solicitud inválida',
  [HttpStatus.UNAUTHORIZED]: 'No autenticado',
  [HttpStatus.FORBIDDEN]: 'Acceso denegado',
  [HttpStatus.NOT_FOUND]: 'No encontrado',
  [HttpStatus.CONFLICT]: 'Conflicto',
  [HttpStatus.TOO_MANY_REQUESTS]: 'Demasiadas solicitudes',
  [HttpStatus.UNPROCESSABLE_ENTITY]: 'Entidad no procesable',
  [HttpStatus.INTERNAL_SERVER_ERROR]: 'Error interno del servidor',
};

export function translateValidationMessage(message: string) {
  let translated = message.trim();
  for (const { pattern, replacement } of VALIDATION_TRANSLATIONS) {
    translated = translated.replace(pattern, replacement);
  }
  return normalizeApiMessage(translated);
}

export function normalizeApiMessage(message: string) {
  let normalized = message.trim();
  for (const [pattern, replacement] of DIRECT_REPLACEMENTS) {
    normalized = normalized.replace(pattern, replacement);
  }
  return normalized;
}

export function normalizeApiMessages(input: unknown): string[] {
  if (Array.isArray(input)) {
    return input
      .flatMap((item) => normalizeApiMessages(item))
      .filter(Boolean);
  }
  if (typeof input === 'string') {
    const normalized = translateValidationMessage(input);
    return normalized ? [normalized] : [];
  }
  return [];
}

export function collectValidationMessages(errors: ValidationError[]): string[] {
  return errors.flatMap((error) => flattenValidationError(error));
}

function flattenValidationError(error: ValidationError, parentPath?: string): string[] {
  const propertyPath = parentPath ? `${parentPath}.${error.property}` : error.property;
  const messages = Object.values(error.constraints ?? {}).map((message) =>
    translateValidationMessage(message.replace(error.property, propertyPath)),
  );

  if (messages.length > 0) {
    return messages;
  }

  return (error.children ?? []).flatMap((child) =>
    flattenValidationError(child, propertyPath),
  );
}

export function createValidationException(errors: ValidationError[]) {
  const messages = collectValidationMessages(errors);
  return new BadRequestException({
    message: messages.join(', ') || 'Solicitud inválida',
    errors: messages,
    code: 'VALIDATION_ERROR',
  });
}

export function buildApiErrorResponse(params: {
  statusCode: number;
  message: string;
  request: RequestWithId;
  error?: string;
  errors?: string[];
  code?: string;
}): ApiErrorResponse {
  return {
    statusCode: params.statusCode,
    error: params.error ?? STATUS_LABELS[params.statusCode] ?? 'Error',
    message: normalizeApiMessage(params.message),
    ...(params.errors && params.errors.length > 0
      ? { errors: params.errors.map((item) => normalizeApiMessage(item)) }
      : {}),
    ...(params.code ? { code: params.code } : {}),
    path: params.request.originalUrl ?? params.request.url ?? '/',
    ...(params.request.requestId ? { requestId: params.request.requestId } : {}),
    timestamp: new Date().toISOString(),
  };
}

export function mapMulterMessage(code: string, fallback: string) {
  switch (code) {
    case 'LIMIT_FILE_SIZE':
      return 'El archivo excede el tamaño máximo permitido';
    case 'LIMIT_FILE_COUNT':
      return 'Se excedió la cantidad máxima de archivos';
    case 'LIMIT_FIELD_COUNT':
      return 'Se excedió la cantidad máxima de campos';
    case 'LIMIT_UNEXPECTED_FILE':
      return 'Se recibió un archivo no esperado';
    default:
      return normalizeApiMessage(fallback);
  }
}
