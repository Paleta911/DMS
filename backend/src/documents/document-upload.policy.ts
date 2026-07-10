import { BadRequestException } from '@nestjs/common';
import { basename, extname, join } from 'path';
import { getEnv, getEnvNumber } from '../common/env.utils';

const DEFAULT_ALLOWED_MIME_BY_EXTENSION: Record<string, string[]> = {
  '.pdf': ['application/pdf'],
  '.docx': [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
  '.xls': [
    'application/vnd.ms-excel',
    'application/msexcel',
    'application/x-msexcel',
    'application/xls',
  ],
  '.xlsx': [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
};

const DEFAULT_ALLOWED_EXTENSIONS = Object.keys(DEFAULT_ALLOWED_MIME_BY_EXTENSION);

function parseCsvSet(value: string | null | undefined, fallback: string[]) {
  const parsed = (value ?? '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry.length > 0);
  return new Set(
    (parsed.length > 0 ? parsed : fallback).map((entry) => entry.toLowerCase()),
  );
}

export const UPLOAD_DIR =
  getEnv('UPLOAD_DIR') ?? join(process.cwd(), 'uploads');
export const MAX_FILE_SIZE_MB = getEnvNumber('MAX_FILE_SIZE_MB', 20);
export const MAX_FILE_SIZE = Math.max(MAX_FILE_SIZE_MB, 1) * 1024 * 1024;
export const UPLOAD_ORIGINAL_NAME_MAX_LENGTH = Math.max(
  20,
  getEnvNumber('UPLOAD_ORIGINAL_NAME_MAX_LENGTH', 180),
);
export const ALLOWED_EXTENSIONS = parseCsvSet(
  getEnv('ALLOWED_EXTENSIONS'),
  DEFAULT_ALLOWED_EXTENSIONS,
);
export const ALLOWED_MIME_TYPES = parseCsvSet(
  getEnv('ALLOWED_MIME_TYPES'),
  Object.values(DEFAULT_ALLOWED_MIME_BY_EXTENSION).flat(),
);

export function sanitizeUploadOriginalName(originalName: string) {
  const normalized = basename(
    String(originalName ?? '').normalize('NFKC').replace(/\\/g, '/'),
  ).trim();
  if (!normalized) {
    throw new BadRequestException('Nombre de archivo inválido');
  }
  if (normalized.length > UPLOAD_ORIGINAL_NAME_MAX_LENGTH) {
    throw new BadRequestException(
      `El nombre del archivo excede el máximo de ${UPLOAD_ORIGINAL_NAME_MAX_LENGTH} caracteres`,
    );
  }
  if (/[\u0000-\u001f\u007f]/.test(normalized) || normalized.startsWith('.')) {
    throw new BadRequestException('Nombre de archivo inválido');
  }
  return normalized;
}

export function assertUploadMimeType(params: {
  originalName: string;
  mimeType: string;
}) {
  const originalName = sanitizeUploadOriginalName(params.originalName);
  const extension = extname(originalName).toLowerCase();
  if (!extension || !ALLOWED_EXTENSIONS.has(extension)) {
    throw new BadRequestException('Extensión de archivo no permitida');
  }

  const mimeType = String(params.mimeType ?? '').trim().toLowerCase();
  if (!mimeType || !ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new BadRequestException('Tipo MIME de archivo no permitido');
  }

  const allowedMimeTypes = DEFAULT_ALLOWED_MIME_BY_EXTENSION[extension] ?? [];
  if (!allowedMimeTypes.includes(mimeType)) {
    throw new BadRequestException(
      'La extensión del archivo no coincide con el tipo MIME',
    );
  }

  return { originalName, extension, mimeType };
}
