export type SavedView<T> = {
  id: string;
  name: string;
  filters: T;
  createdAt: string;
  updatedAt: string;
};

type SavedViewState<T> = {
  lastUsed: T;
  views: SavedView<T>[];
};

function buildStorageKey(baseKey: string, scope?: string | null) {
  return scope ? `${baseKey}:${scope}` : baseKey;
}

function safeParse<T>(raw: string | null): SavedViewState<T> | null {
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as SavedViewState<T>;
  } catch {
    return null;
  }
}

export function loadSavedViewState<T>(
  baseKey: string,
  fallback: T,
  scope?: string | null,
): SavedViewState<T> {
  if (typeof window === 'undefined') {
    return { lastUsed: fallback, views: [] };
  }
  const parsed = safeParse<T>(window.localStorage.getItem(buildStorageKey(baseKey, scope)));
  return {
    lastUsed: parsed?.lastUsed ?? fallback,
    views: parsed?.views ?? [],
  };
}

export function saveSavedViewState<T>(
  baseKey: string,
  state: SavedViewState<T>,
  scope?: string | null,
) {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(
    buildStorageKey(baseKey, scope),
    JSON.stringify(state),
  );
}

export function createSavedView<T>(name: string, filters: T): SavedView<T> {
  const timestamp = new Date().toISOString();
  return {
    id:
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name,
    filters,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}
