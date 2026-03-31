import type { ReactNode } from 'react';

export function ResponsiveActions({ children }: { children: ReactNode }) {
  return (
    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
      {children}
    </div>
  );
}
