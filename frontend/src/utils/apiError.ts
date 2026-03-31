type ApiErrorPayload = {
  message?: unknown;
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
  if (value && typeof value === 'object') {
    try {
      const json = JSON.stringify(value);
      return json.length > 2 ? json : null;
    } catch {
      return null;
    }
  }
  return null;
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  const apiError = error as ApiErrorShape;
  const responseMessage = normalizeMessage(apiError?.response?.data?.message);
  if (responseMessage) {
    return responseMessage;
  }
  const directMessage = normalizeMessage(apiError?.message);
  return directMessage ?? fallback;
}
