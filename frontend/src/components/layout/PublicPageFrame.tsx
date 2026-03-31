import type { ReactNode } from 'react';
import { ThemeToggle } from '../ui/ThemeToggle';
import { LanguageToggle } from '../ui/LanguageToggle';

export function PublicPageFrame({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-6">
      <div className="absolute right-4 top-4 flex items-center gap-3 sm:right-6 sm:top-6">
        <ThemeToggle />
        <LanguageToggle />
      </div>
      {children}
    </div>
  );
}
