import type { ReactNode } from 'react';
import { SectionCard } from './SectionCard';

type FilterCardProps = {
  children: ReactNode;
  footer?: ReactNode;
  gridClassName?: string;
  className?: string;
  footerClassName?: string;
};

export function FilterCard({
  children,
  footer,
  gridClassName = 'grid gap-4',
  className,
  footerClassName,
}: FilterCardProps) {
  return (
    <SectionCard className={className}>
      <div className={gridClassName}>{children}</div>
      {footer ? (
        <div className={['mt-4', footerClassName].filter(Boolean).join(' ')}>
          {footer}
        </div>
      ) : null}
    </SectionCard>
  );
}
