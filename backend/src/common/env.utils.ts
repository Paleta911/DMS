export function getEnv(name: string, fallback?: string) {
  const value = process.env[name];
  if (value === undefined || value === '') {
    return fallback;
  }
  return value;
}

export function getEnvNumber(name: string, fallback: number) {
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
  const value = getEnv(name);
  if (value === undefined) {
    return fallback;
  }
  return value.toLowerCase() === 'true';
}
