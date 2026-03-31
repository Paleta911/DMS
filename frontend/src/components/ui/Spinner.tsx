export function Spinner({ label = 'Cargando' }: { label?: string }) {
  return (
    <div
      role="status"
      aria-label={label}
      className="h-5 w-5 animate-spin rounded-full border-2 border-ink/20 border-t-ink"
    />
  );
}
