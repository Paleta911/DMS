import { QueryClient } from "@tanstack/react-query";

// Shared QueryClient config: retries transient failures, avoids retries for 4xx business errors.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: Error) => {
        const status =
          typeof error === "object" &&
          error !== null &&
          "response" in error &&
          typeof error.response === "object" &&
          error.response !== null &&
          "status" in error.response
            ? (error.response as { status?: number }).status
            : undefined;
        // Errores 4xx suelen ser de negocio/autorizacion: no conviene reintentar.
        if (status && status >= 400 && status < 500) {
          return false;
        }
        // Reintento unico para fallos transitorios de red/5xx.
        return failureCount < 1;
      },
      // Balancea frescura y costo de refetch para tablas/paneles administrativos.
      staleTime: 15_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
  },
});
