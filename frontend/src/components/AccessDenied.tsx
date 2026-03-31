export function AccessDenied() {
  return (
    <section className="card p-6 text-center" aria-labelledby="access-denied-title">
      <h2 id="access-denied-title" className="font-display text-lg text-brand-primary">
        Acceso denegado
      </h2>
      <p className="mt-2 text-sm text-brand-textMuted">
        No tienes permisos para ver esta sección.
      </p>
    </section>
  );
}
