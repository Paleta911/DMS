export type ApiErrorPayload = {
  message?: unknown;
  code?: unknown;
  remainingSec?: unknown;
  blockedUntil?: unknown;
};

type ApiErrorShape = {
  response?: {
    data?: ApiErrorPayload;
    status?: number;
  };
  message?: string;
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
    pattern: /^(.+?) must be a number conforming to the specified constraints$/i,
    replacement: '$1 debe ser un número válido',
  },
  {
    pattern: /^(.+?) must be one of the following values: (.+)$/i,
    replacement: '$1 debe ser uno de los siguientes valores: $2',
  },
];

const TECHNICAL_MESSAGE_PATTERNS: RegExp[] = [
  /\bis not defined\b/i,
  /\bnot a function\b/i,
  /cannot read properties/i,
  /cannot destructure/i,
  /toISOString is not a function/i,
  /request failed with status code/i,
  /network error/i,
  /failed to fetch/i,
  /\baxioserror\b/i,
  /\berr_[a-z0-9_]+\b/i,
  /\breferenceerror\b/i,
  /\btypeerror\b/i,
  /\bsyntaxerror\b/i,
  /unexpected token/i,
];

const GENERIC_INTERNAL_MESSAGE_PATTERNS: RegExp[] = [
  /^error interno del servidor$/i,
  /^internal server error$/i,
];

const STATUS_MESSAGES: Partial<Record<number, string>> = {
  400: 'No fue posible completar la acción. Revisa los datos e inténtalo de nuevo.',
  401: 'Tu sesión no es válida o ya expiró. Inicia sesión nuevamente.',
  403: 'No tienes permiso para realizar esta acción.',
  404: 'No se encontró la información solicitada.',
  409: 'No fue posible completar la acción porque hay un conflicto con los datos.',
  429: 'Demasiadas solicitudes. Intenta de nuevo en un momento.',
  500: 'Ocurrió un problema interno. Intenta de nuevo.',
};

function localizeValidationMessage(message: string) {
  let translated = message.trim();
  for (const { pattern, replacement } of VALIDATION_TRANSLATIONS) {
    translated = translated.replace(pattern, replacement);
  }
  return translated;
}

function normalizeMessage(value: unknown): string | null {
  if (Array.isArray(value)) {
    const normalized = value
      .map((item) => localizeValidationMessage(String(item)))
      .filter(Boolean)
      .join(', ');
    return normalized || null;
  }
  if (typeof value === 'string') {
    const trimmed = localizeValidationMessage(value);
    return trimmed.length > 0 ? trimmed : null;
  }
  return null;
}

export function isTechnicalErrorMessage(message: string) {
  const trimmed = message.trim();
  if (!trimmed) {
    return false;
  }
  return TECHNICAL_MESSAGE_PATTERNS.some((pattern) => pattern.test(trimmed));
}

function isGenericInternalMessage(message: string) {
  const trimmed = message.trim();
  if (!trimmed) {
    return false;
  }
  return GENERIC_INTERNAL_MESSAGE_PATTERNS.some((pattern) => pattern.test(trimmed));
}

export function getFriendlyStatusMessage(status?: number, fallback?: string) {
  return (status ? STATUS_MESSAGES[status] : undefined) ?? fallback ?? 'Ocurrió un problema inesperado. Intenta de nuevo.';
}

function sanitizeFriendlyMessage(
  message: string | null,
  status: number | undefined,
  fallback?: string,
) {
  if (!message) {
    return null;
  }
  if (status && status >= 500) {
    return getFriendlyStatusMessage(status, fallback);
  }
  if (isTechnicalErrorMessage(message) || isGenericInternalMessage(message)) {
    return getFriendlyStatusMessage(status, fallback);
  }
  return message;
}

export function getApiErrorPayload(error: unknown): ApiErrorPayload | null {
  const apiError = error as ApiErrorShape;
  const payload = apiError?.response?.data;
  if (!payload || typeof payload !== 'object') {
    return null;
  }
  return payload;
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  const apiError = error as ApiErrorShape;
  const status = apiError?.response?.status;
  const responseMessage = sanitizeFriendlyMessage(
    normalizeMessage(getApiErrorPayload(error)?.message),
    status,
    fallback,
  );
  if (responseMessage) {
    return responseMessage;
  }
  const directMessage = sanitizeFriendlyMessage(
    normalizeMessage(apiError?.message),
    status,
    fallback,
  );
  if (directMessage) {
    return directMessage;
  }
  return getFriendlyStatusMessage(status, fallback);
}
