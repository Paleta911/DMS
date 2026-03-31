import { BadRequestException } from '@nestjs/common';
import {
  assertUploadMimeType,
  sanitizeUploadOriginalName,
} from './document-upload.policy';

describe('document-upload.policy', () => {
  it('acepta tipos MIME coherentes con la extension', () => {
    expect(
      assertUploadMimeType({
        originalName: 'manual.pdf',
        mimeType: 'application/pdf',
      }),
    ).toEqual({
      originalName: 'manual.pdf',
      extension: '.pdf',
      mimeType: 'application/pdf',
    });
  });

  it('rechaza tipos MIME que no coinciden con la extension', () => {
    expect(() =>
      assertUploadMimeType({
        originalName: 'manual.pdf',
        mimeType:
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      }),
    ).toThrow(BadRequestException);
  });

  it('normaliza rutas del nombre original', () => {
    expect(sanitizeUploadOriginalName('C:\\fakepath\\manual.pdf')).toBe(
      'manual.pdf',
    );
  });

  it('rechaza nombres ocultos o vacios', () => {
    expect(() => sanitizeUploadOriginalName('   ')).toThrow(
      BadRequestException,
    );
    expect(() => sanitizeUploadOriginalName('.env')).toThrow(
      BadRequestException,
    );
  });
});
