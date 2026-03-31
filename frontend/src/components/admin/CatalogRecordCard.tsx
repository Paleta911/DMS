import type { ReactNode } from 'react';

type CatalogRecordCardProps = {
  metadata: Array<{
    label: string;
    value: ReactNode;
    emphasize?: boolean;
  }>;
  actions: ReactNode;
};

export function CatalogRecordCard({ metadata, actions }: CatalogRecordCardProps) {
  return (
    <div className="rounded-2xl border border-brand-border bg-brand-surface p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid flex-1 gap-3 sm:grid-cols-2">
          {metadata.map((item) => (
            <div key={item.label}>
              <div className="text-xs uppercase tracking-[0.2em] text-brand-textMuted">
                {item.label}
              </div>
              <div
                className={
                  item.emphasize
                    ? 'text-xl font-semibold text-ink'
                    : 'text-base text-brand-text'
                }
              >
                {item.value}
              </div>
            </div>
          ))}
        </div>
        <div className="lg:min-w-60">{actions}</div>
      </div>
    </div>
  );
}
