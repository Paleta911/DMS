import { getEnv } from './env.utils';
import { writeAppLog } from './logging.utils';

const WEAK_JWT_SECRETS = new Set([
  'change_this_secret',
  'dev_secret',
  'changeme',
  'secret',
  'jwt_secret',
]);

export function getRequiredEnv(name: string) {
  const value = getEnv(name);
  if (!value) {
    throw new Error(`${name} no configurado`);
  }
  return value;
}

export function assertSecurityConfig() {
  const nodeEnv = (getEnv('NODE_ENV', 'development') ?? 'development').toLowerCase();
  if (nodeEnv !== 'production') {
    return;
  }

  const jwtSecret = getRequiredEnv('JWT_SECRET');
  if (jwtSecret.length < 16 || WEAK_JWT_SECRETS.has(jwtSecret.toLowerCase())) {
    throw new Error('JWT_SECRET inseguro en produccion');
  }

  const refreshSecret = getEnv('JWT_REFRESH_SECRET');
  if (!refreshSecret) {
    writeAppLog({
      level: 'warn',
      event: 'security_warning',
      message:
        'JWT_REFRESH_SECRET no esta configurado en produccion. Se reutilizara JWT_SECRET, lo cual no es ideal',
    });
  } else if (
    refreshSecret.length < 16 ||
    WEAK_JWT_SECRETS.has(refreshSecret.toLowerCase())
  ) {
    throw new Error('JWT_REFRESH_SECRET inseguro en produccion');
  }

  const corsOrigin = getEnv('CORS_ORIGIN', '*') ?? '*';
  if (corsOrigin.trim() === '*') {
    writeAppLog({
      level: 'warn',
      event: 'security_warning',
      message: 'CORS_ORIGIN esta abierto para cualquier origen en produccion',
    });
  }

  const bootstrapToken = getEnv('BOOTSTRAP_TOKEN');
  if (!bootstrapToken) {
    writeAppLog({
      level: 'warn',
      event: 'security_warning',
      message: 'BOOTSTRAP_TOKEN no esta configurado en produccion',
    });
  } else if (bootstrapToken.length < 16) {
    throw new Error('BOOTSTRAP_TOKEN inseguro en produccion');
  }

  const emailMode = (getEnv('EMAIL_MODE', 'console') ?? 'console').toLowerCase();
  const loginBlockAfter = Number(getEnv('AUTH_LOGIN_BLOCK_AFTER', '5'));
  const loginBlockSec = Number(getEnv('AUTH_LOGIN_BLOCK_SEC', '900'));
  if (!Number.isFinite(loginBlockAfter) || loginBlockAfter < 3) {
    throw new Error('AUTH_LOGIN_BLOCK_AFTER inseguro en produccion');
  }
  if (!Number.isFinite(loginBlockSec) || loginBlockSec < 60) {
    throw new Error('AUTH_LOGIN_BLOCK_SEC inseguro en produccion');
  }

  if (emailMode !== 'smtp') {
    throw new Error('EMAIL_MODE debe ser smtp en produccion');
  }

  const smtpHost = getEnv('SMTP_HOST');
  const smtpFrom = getEnv('SMTP_FROM');
  const smtpUser = getEnv('SMTP_USER');
  const smtpPass = getEnv('SMTP_PASS');

  if (!smtpHost || !smtpFrom) {
    throw new Error('SMTP_HOST y SMTP_FROM son obligatorios cuando EMAIL_MODE=smtp');
  }
  if ((smtpUser && !smtpPass) || (!smtpUser && smtpPass)) {
    throw new Error('SMTP_USER y SMTP_PASS deben configurarse juntos');
  }
}
