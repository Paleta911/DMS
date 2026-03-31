import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: Error) => {
        const status =
          typeof error === 'object' &&
          error !== null &&
          'response' in error &&
          typeof error.response === 'object' &&
          error.response !== null &&
          'status' in error.response
            ? (error.response as { status?: number }).status
            : undefined;
        if (status && status >= 400 && status < 500) {
          return false;
        }
        return failureCount < 1;
      },
      staleTime: 15_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
  },
});
