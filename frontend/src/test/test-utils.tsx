import type { ReactElement, ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { queryClient } from "../app/queryClient";
import { FeatureFlagsProvider } from "../features/FeatureFlagsProvider";
import { I18nProvider } from "../i18n/I18nProvider";

// Shared test renderer that mirrors app providers (query client, flags, i18n, router).
export function renderWithProviders(
  ui: ReactElement,
  options?: {
    route?: string;
    wrapper?: (children: ReactNode) => ReactNode;
  },
) {
  const route = options?.route ?? "/";

  const content = (
    // Keep provider order aligned with production app bootstrap.
    <QueryClientProvider client={queryClient}>
      <FeatureFlagsProvider>
        <I18nProvider>
          <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
        </I18nProvider>
      </FeatureFlagsProvider>
    </QueryClientProvider>
  );

  return render(options?.wrapper ? <>{options.wrapper(content)}</> : content);
}
