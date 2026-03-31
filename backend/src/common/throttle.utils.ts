import type { ThrottlerGetTrackerFunction } from '@nestjs/throttler';
import { getEnvNumber } from './env.utils';

type ThrottleExtraOptions = {
  getTracker?: ThrottlerGetTrackerFunction;
};

function getRequestIp(req: Record<string, unknown>) {
  const forwardedFor = req.headers as
    | { 'x-forwarded-for'?: string | string[] }
    | undefined;
  const forwardedValue = forwardedFor?.['x-forwarded-for'];
  const forwardedIp = Array.isArray(forwardedValue)
    ? forwardedValue[0]
    : forwardedValue?.split(',')[0];
  const ips = Array.isArray(req.ips) ? req.ips : undefined;
  const requestIp =
    typeof req.ip === 'string'
      ? req.ip
      : typeof ips?.[0] === 'string'
        ? ips[0]
        : undefined;
  return (forwardedIp ?? requestIp ?? 'anonymous').trim().toLowerCase();
}

function getRequestBody(req: Record<string, unknown>) {
  return typeof req.body === 'object' && req.body !== null
    ? (req.body as Record<string, unknown>)
    : {};
}

function getNormalizedEmail(value: unknown) {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

export const throttleByIpAndEmail: ThrottlerGetTrackerFunction = (req) => {
  const body = getRequestBody(req);
  const email = getNormalizedEmail(body.email);
  return `${getRequestIp(req)}:${email ?? 'anonymous'}`;
};

export const throttleByUserIdOrIp: ThrottlerGetTrackerFunction = (req) => {
  const user = typeof req.user === 'object' && req.user !== null
    ? (req.user as { id?: number | string })
    : undefined;
  const userId =
    typeof user?.id === 'number' || typeof user?.id === 'string'
      ? String(user.id)
      : null;
  return userId ? `user:${userId}` : `ip:${getRequestIp(req)}`;
};

export function throttleFromEnv(
  limitEnvKey: string,
  ttlSecEnvKey: string,
  defaultLimit: number,
  defaultTtlSec: number,
  extraOptions?: ThrottleExtraOptions,
) {
  return {
    default: {
      limit: getEnvNumber(limitEnvKey, defaultLimit),
      ttl: getEnvNumber(ttlSecEnvKey, defaultTtlSec) * 1000,
      ...(extraOptions?.getTracker
        ? { getTracker: extraOptions.getTracker }
        : {}),
    },
  };
}
