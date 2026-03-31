import type { ReactNode } from 'react';

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="font-display text-xl text-brand-primary sm:text-2xl">{title}</h2>
        {subtitle ? <p className="text-sm text-brand-textMuted">{subtitle}</p> : null}
      </div>
      {actions ? <div className="w-full sm:w-auto">{actions}</div> : null}
    </div>
  );
}
