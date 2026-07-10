import type { ReactNode } from "react";
import { RouterProvider } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "framer-motion";
import { router } from "./router";
import { queryClient } from "./queryClient";
import { AuthProvider } from "../auth/AuthContext";
import { ToastProvider } from "../components/ToastProvider";
import { EASE } from "../components/ui/Motion";
import { ThemeProvider } from "../theme/ThemeProvider";
import { FeatureFlagsProvider } from "../features/FeatureFlagsProvider";
import { I18nProvider } from "../i18n/I18nProvider";

export function AppProviders({ children }: { children?: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {/* Provider order matters: feature flags/i18n/theme wrap routed UI consistently. */}
      <FeatureFlagsProvider>
        <I18nProvider>
          <ThemeProvider>
            <MotionConfig
              reducedMotion="user"
              transition={{ duration: 0.35, ease: EASE }}
            >
              <AuthProvider>
                <ToastProvider>
                  {children ?? <RouterProvider router={router} />}
                </ToastProvider>
              </AuthProvider>
            </MotionConfig>
          </ThemeProvider>
        </I18nProvider>
      </FeatureFlagsProvider>
    </QueryClientProvider>
  );
}
