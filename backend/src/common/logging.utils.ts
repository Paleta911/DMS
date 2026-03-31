import { appendFileSync, existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { getRequestId } from './request-context';

type LogLevel = 'info' | 'warn' | 'error';

const LOG_FORMAT = (process.env.LOG_FORMAT ?? 'pretty').toLowerCase();
const LOG_AS_JSON = LOG_FORMAT === 'json';
const LOG_FILE_PATH = process.env.LOG_FILE_PATH?.trim() || null;

export function writeAppLog(params: {
  level?: LogLevel;
  event: string;
  message?: string;
  data?: Record<string, unknown>;
}) {
  const level = params.level ?? 'info';
  const requestId = getRequestId();
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    event: params.event,
    ...(params.message ? { message: params.message } : {}),
    ...(requestId ? { requestId } : {}),
    ...(params.data ?? {}),
  };

  if (LOG_AS_JSON) {
    const message = JSON.stringify(payload);
    writeToConsole(level, message);
    writeToFile(message);
    return;
  }

  const details = Object.entries({
    ...(requestId ? { requestId } : {}),
    ...(params.data ?? {}),
  })
    .map(([key, value]) => `${key}=${formatValue(value)}`)
    .join(' ');

  const prettyMessage = [params.message, details].filter(Boolean).join(' ');
  const message = `[${params.event}] ${prettyMessage}`.trim();
  writeToConsole(level, message);
  writeToFile(message);
}

function writeToConsole(level: LogLevel, value: string) {
  switch (level) {
    case 'error':
      console.error(value);
      return;
    case 'warn':
      console.warn(value);
      return;
    default:
      console.log(value);
  }
}

function formatValue(value: unknown) {
  if (value === null || value === undefined) {
    return 'null';
  }
  if (typeof value === 'string') {
    return value.includes(' ') ? JSON.stringify(value) : value;
  }
  return JSON.stringify(value);
}

function writeToFile(value: string) {
  if (!LOG_FILE_PATH) {
    return;
  }
  const targetDir = dirname(LOG_FILE_PATH);
  if (!existsSync(targetDir)) {
    mkdirSync(targetDir, { recursive: true });
  }
  appendFileSync(LOG_FILE_PATH, `${value}\n`, 'utf8');
}
