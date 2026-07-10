import { createContext, useContext, useMemo, type ReactNode } from "react";

// Client-side feature flag provider sourced from VITE_FEATURE_FLAGS at app startup.
export type FrontendFeatureFlag =
  | "admin-analytics"
  | "notifications"
  | "saved-views"
  | "advanced-exports"
  | "dark-mode"
  | "i18n";

const DEFAULT_FEATURE_FLAGS: FrontendFeatureFlag[] = [
  "admin-analytics",
  "notifications",
  "saved-views",
  "advanced-exports",
  "dark-mode",
  "i18n",
];

type FeatureFlagsContextValue = {
  enabled: Set<string>;
  isEnabled: (flag: FrontendFeatureFlag | string) => boolean;
};

const FeatureFlagsContext = createContext<FeatureFlagsContextValue | undefined>(
  undefined,
);

function getEnabledFlags() {
  // Empty env falls back to a sane default set for local development.
  const configured = import.meta.env.VITE_FEATURE_FLAGS as string | undefined;
  const values =
    configured && configured.trim().length > 0
      ? configured.split(",").map((value) => value.trim())
      : DEFAULT_FEATURE_FLAGS;
  return new Set(values.filter(Boolean));
}

export function FeatureFlagsProvider({ children }: { children: ReactNode }) {
  const value = useMemo<FeatureFlagsContextValue>(() => {
    // Flags are read once at startup; runtime toggling is not part of this provider.
    const enabled = getEnabledFlags();
    return {
      enabled,
      isEnabled: (flag) => enabled.has(flag.trim()),
    };
  }, []);

  return (
    <FeatureFlagsContext.Provider value={value}>
      {children}
    </FeatureFlagsContext.Provider>
  );
}

export function useFeatureFlags() {
  const context = useContext(FeatureFlagsContext);
  if (!context) {
    throw new Error("useFeatureFlags must be used within FeatureFlagsProvider");
  }
  return context;
}

export function useFeatureFlag(flag: FrontendFeatureFlag | string) {
  // Convenience hook for boolean checks in components.
  const { isEnabled } = useFeatureFlags();
  return isEnabled(flag);
}
