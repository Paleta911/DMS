export function EmptyState({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <section className="card p-6 text-center" aria-labelledby="empty-state-title">
      <h2 id="empty-state-title" className="font-display text-lg text-brand-primary">
        {title}
      </h2>
      {subtitle ? <p className="mt-2 text-sm text-brand-textMuted">{subtitle}</p> : null}
    </section>
  );
}
