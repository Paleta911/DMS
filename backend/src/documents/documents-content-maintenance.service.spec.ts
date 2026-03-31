jest.mock('node:fs', () => {
  const actual = jest.requireActual('node:fs');
  return {
    ...actual,
    existsSync: jest.fn(),
  };
});

import { existsSync } from 'node:fs';
import { DocumentsContentMaintenanceService } from './documents-content-maintenance.service';
import { VersionTextSource } from '../versions/version-text-source.enum';

describe('DocumentsContentMaintenanceService', () => {
  let service: DocumentsContentMaintenanceService;
  const queryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
  };
  const versionRepo = {
    createQueryBuilder: jest.fn(() => queryBuilder),
    save: jest.fn(),
  };
  const documentsFileService = {
    extractTextDetails: jest.fn(),
  };
  const searchService = {
    enqueueIndexDocument: jest.fn(),
  };

  beforeEach(() => {
    service = new DocumentsContentMaintenanceService(
      versionRepo as never,
      documentsFileService as never,
      searchService as never,
    );
    jest.clearAllMocks();
  });

  it('reprocesa versiones, actualiza metadata y reindexa documentos tocados', async () => {
    queryBuilder.getMany.mockResolvedValue([
      {
        id: 10,
        storedName: 'a.pdf',
        originalName: 'a.pdf',
        contentText: null,
        textSource: VersionTextSource.None,
        ocrApplied: false,
        ocrPageCount: null,
        document: { id: 7 },
      },
    ]);
    (existsSync as jest.Mock).mockReturnValue(true);
    documentsFileService.extractTextDetails.mockResolvedValue({
      contentText: 'Texto OCR recuperado',
      textSource: VersionTextSource.PdfOcr,
      ocrApplied: true,
      ocrPageCount: 1,
    });

    const result = await service.reprocessContent();

    expect(versionRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        contentText: 'Texto OCR recuperado',
        textSource: VersionTextSource.PdfOcr,
        ocrApplied: true,
        ocrPageCount: 1,
      }),
    );
    expect(searchService.enqueueIndexDocument).toHaveBeenCalledWith(7);
    expect(result).toEqual({
      processed: 1,
      updated: 1,
      skipped: 0,
      missingFiles: 0,
      reindexedDocuments: 1,
      force: false,
      documentId: null,
    });
  });

  it('cuenta archivos faltantes sin fallar', async () => {
    queryBuilder.getMany.mockResolvedValue([
      {
        id: 11,
        storedName: 'missing.pdf',
        originalName: 'missing.pdf',
        contentText: null,
        textSource: VersionTextSource.None,
        ocrApplied: false,
        ocrPageCount: null,
        document: { id: 8 },
      },
    ]);
    (existsSync as jest.Mock).mockReturnValue(false);

    const result = await service.reprocessContent();

    expect(versionRepo.save).not.toHaveBeenCalled();
    expect(result.missingFiles).toBe(1);
    expect(result.updated).toBe(0);
  });
});
