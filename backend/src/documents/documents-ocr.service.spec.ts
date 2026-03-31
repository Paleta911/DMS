jest.mock('node:fs/promises', () => ({
  mkdtemp: jest.fn(),
  readdir: jest.fn(),
  rm: jest.fn(),
}));

import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { DocumentsOcrService } from './documents-ocr.service';
import { VersionTextSource } from '../versions/version-text-source.enum';

describe('DocumentsOcrService', () => {
  const envSnapshot = { ...process.env };

  afterEach(() => {
    process.env = { ...envSnapshot };
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('extrae texto con OCR cuando las dependencias responden', async () => {
    process.env.OCR_ENABLED = 'true';
    const service = new DocumentsOcrService();

    (mkdtemp as jest.Mock).mockResolvedValue('C:\\temp\\ocr');
    (readdir as jest.Mock).mockResolvedValue(['page-1.png', 'page-2.png']);
    (rm as jest.Mock).mockResolvedValue(undefined);

    jest
      .spyOn(service as never, 'runCommand' as never)
      .mockImplementation(async (_command: string, args: string[]) => {
        if (args.includes('-png')) {
          return { stdout: '', stderr: '' };
        }
        return { stdout: 'Texto OCR detectado', stderr: '' };
      });

    const result = await service.extractTextFromPdf('C:\\docs\\scan.pdf');

    expect(result).toEqual({
      contentText: 'Texto OCR detectado Texto OCR detectado',
      textSource: VersionTextSource.PdfOcr,
      ocrApplied: true,
      ocrPageCount: 2,
    });
  });

  it('devuelve NONE cuando OCR está deshabilitado', async () => {
    process.env.OCR_ENABLED = 'false';
    const service = new DocumentsOcrService();

    const result = await service.extractTextFromPdf('C:\\docs\\scan.pdf');

    expect(result).toEqual({
      contentText: null,
      textSource: VersionTextSource.None,
      ocrApplied: false,
      ocrPageCount: null,
    });
  });

  it('tolera binarios faltantes sin romper la carga', async () => {
    process.env.OCR_ENABLED = 'true';
    const service = new DocumentsOcrService();

    (mkdtemp as jest.Mock).mockResolvedValue('C:\\temp\\ocr');
    (rm as jest.Mock).mockResolvedValue(undefined);
    const missingBinaryError = Object.assign(new Error('missing binary'), {
      code: 'ENOENT',
      path: 'pdftoppm',
    });
    jest
      .spyOn(service as never, 'runCommand' as never)
      .mockRejectedValue(missingBinaryError);

    const result = await service.extractTextFromPdf('C:\\docs\\scan.pdf');

    expect(result.textSource).toBe(VersionTextSource.None);
    expect(result.contentText).toBeNull();
  });
});
