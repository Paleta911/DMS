import type { ReactNode } from 'react';

export function PageContainer({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={[
        'mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-4',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  );
}
