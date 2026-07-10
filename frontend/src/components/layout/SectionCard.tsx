import type { ReactNode } from 'react';

export function SectionCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={['card min-w-0 p-4 sm:p-6', className].filter(Boolean).join(' ')}>
      {children}
    </div>
  );
}
