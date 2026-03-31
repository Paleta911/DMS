import { useCallback, useMemo, useState } from 'react';
import {
  createSavedView,
  loadSavedViewState,
  saveSavedViewState,
  type SavedView,
} from '../utils/savedViews';

type UseSavedViewsOptions<T> = {
  storageKey: string;
  scope?: string | null;
  fallback: T;
};

export function useSavedViews<T>({
  storageKey,
  scope,
  fallback,
}: UseSavedViewsOptions<T>) {
  const initialState = useMemo(
    () => loadSavedViewState(storageKey, fallback, scope),
    [fallback, scope, storageKey],
  );
  const [views, setViews] = useState<SavedView<T>[]>(initialState.views);

  const persist = useCallback((nextLastUsed: T, nextViews: SavedView<T>[]) => {
    setViews(nextViews);
    saveSavedViewState(
      storageKey,
      {
        lastUsed: nextLastUsed,
        views: nextViews,
      },
      scope,
    );
  }, [scope, storageKey]);

  const saveCurrentView = useCallback((name: string, filters: T) => {
    const normalizedName = name.trim();
    if (!normalizedName) {
      return;
    }

    const existing = views.find(
      (view) => view.name.toLowerCase() === normalizedName.toLowerCase(),
    );
    const nextViews = existing
      ? views.map((view) =>
          view.id === existing.id
            ? { ...view, filters, updatedAt: new Date().toISOString() }
            : view,
        )
      : [createSavedView(normalizedName, filters), ...views].slice(0, 8);

    persist(filters, nextViews);
  }, [persist, views]);

  const deleteView = useCallback((id: string, currentFilters: T) => {
    const nextViews = views.filter((view) => view.id !== id);
    persist(currentFilters, nextViews);
  }, [persist, views]);

  const rememberLastUsed = useCallback((filters: T) => {
    saveSavedViewState(
      storageKey,
      {
        lastUsed: filters,
        views,
      },
      scope,
    );
  }, [scope, storageKey, views]);

  return {
    initialFilters: initialState.lastUsed,
    views,
    saveCurrentView,
    deleteView,
    rememberLastUsed,
  };
}
