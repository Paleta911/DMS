import type { ReactNode } from 'react';

export function SectionCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={['card p-4 sm:p-6', className].filter(Boolean).join(' ')}>
      {children}
    </div>
  );
}
