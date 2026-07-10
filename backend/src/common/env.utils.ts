export function getEnv(name: string, fallback?: string) {
  // Trata cadenas vacias como no configuradas para usar fallback coherente.
  const value = process.env[name];
  if (value === undefined || value === '') {
    return fallback;
  }
  return value;
}

export function getEnvNumber(name: string, fallback: number) {
  // Reutiliza getEnv y protege contra valores no numericos.
  const value = getEnv(name);
  if (value === undefined) {
    return fallback;
  }
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    return fallback;
  }
  return parsed;
}

export function getEnvBool(name: string, fallback: boolean) {
  // Solo "true" (case-insensitive) habilita el flag; lo demas es false.
  const value = getEnv(name);
  if (value === undefined) {
    return fallback;
  }
  return value.toLowerCase() === 'true';
}
