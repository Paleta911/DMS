jest.mock('fs', () => {
  const actual = jest.requireActual('fs');
  return {
    ...actual,
    readFileSync: jest.fn(),
  };
});

jest.mock('pdf-parse', () => jest.fn());
jest.mock('mammoth', () => ({
  __esModule: true,
  default: {
    extractRawText: jest.fn(),
  },
}));

import { readFileSync } from 'fs';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { DocumentsFileService } from './documents-file.service';
import { VersionTextSource } from '../versions/version-text-source.enum';

describe('DocumentsFileService', () => {
  const documentsOcrService = {
    extractTextFromPdf: jest.fn(),
  };

  let service: DocumentsFileService;

  beforeEach(() => {
    service = new DocumentsFileService(documentsOcrService as never);
    jest.clearAllMocks();
    (readFileSync as jest.Mock).mockReturnValue(Buffer.from('%PDF-1.7 sample %%EOF'));
  });

  it('usa el texto nativo del PDF cuando es suficiente', async () => {
    (pdfParse as jest.Mock).mockResolvedValue({
      text: 'Este PDF ya contiene texto suficiente para indexar dentro del sistema.',
    });

    const result = await service.extractTextDetails({
      filePath: 'C:\\docs\\manual.pdf',
      originalName: 'manual.pdf',
      mimeType: 'application/pdf',
    });

    expect(result).toEqual({
      contentText: 'Este PDF ya contiene texto suficiente para indexar dentro del sistema.',
      textSource: VersionTextSource.PdfText,
      ocrApplied: false,
      ocrPageCount: null,
    });
    expect(documentsOcrService.extractTextFromPdf).not.toHaveBeenCalled();
  });

  it('cae a OCR cuando el PDF no trae texto útil', async () => {
    (pdfParse as jest.Mock).mockResolvedValue({ text: '   ' });
    documentsOcrService.extractTextFromPdf.mockResolvedValue({
      contentText: 'Texto detectado por OCR en el archivo escaneado.',
      textSource: VersionTextSource.PdfOcr,
      ocrApplied: true,
      ocrPageCount: 2,
    });

    const result = await service.extractTextDetails({
      filePath: 'C:\\docs\\escaneado.pdf',
      originalName: 'escaneado.pdf',
      mimeType: 'application/pdf',
    });

    expect(documentsOcrService.extractTextFromPdf).toHaveBeenCalledWith(
      'C:\\docs\\escaneado.pdf',
    );
    expect(result).toEqual({
      contentText: 'Texto detectado por OCR en el archivo escaneado.',
      textSource: VersionTextSource.PdfOcr,
      ocrApplied: true,
      ocrPageCount: 2,
    });
  });

  it('extrae texto nativo de DOCX', async () => {
    (mammoth.extractRawText as jest.Mock).mockResolvedValue({
      value: 'Contenido del documento Word para búsqueda interna.',
    });

    const result = await service.extractTextDetails({
      filePath: 'C:\\docs\\manual.docx',
      originalName: 'manual.docx',
      mimeType:
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    expect(result).toEqual({
      contentText: 'Contenido del documento Word para búsqueda interna.',
      textSource: VersionTextSource.DocxText,
      ocrApplied: false,
      ocrPageCount: null,
    });
  });

  it('devuelve NONE cuando la extracción falla', async () => {
    (pdfParse as jest.Mock).mockRejectedValue(new Error('broken pdf'));
    documentsOcrService.extractTextFromPdf.mockResolvedValue({
      contentText: null,
      textSource: VersionTextSource.None,
      ocrApplied: false,
      ocrPageCount: null,
    });

    const result = await service.extractTextDetails({
      filePath: 'C:\\docs\\rot.pdf',
      originalName: 'rot.pdf',
      mimeType: 'application/pdf',
    });

    expect(result.textSource).toBe(VersionTextSource.None);
    expect(result.contentText).toBeNull();
  });
});
