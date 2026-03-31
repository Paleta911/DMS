import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DocumentStatus } from './document-status.enum';
import { DocumentsMutationService } from './documents-mutation.service';

describe('DocumentsMutationService', () => {
  let documentRepo: any;
  let versionRepo: any;
  let categoryRepo: any;
  let userRepo: any;
  let documentTypeRepo: any;
  let areaCodeRepo: any;
  let searchService: any;
  let workflowService: any;
  let service: DocumentsMutationService;

  beforeEach(() => {
    documentRepo = {
      findOne: jest.fn(),
      save: jest.fn().mockImplementation(async (entity) => ({
        id: entity.id ?? 20,
        ...entity,
      })),
      create: jest.fn().mockImplementation((value) => value),
      createQueryBuilder: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ max: 4 }),
      }),
    };
    versionRepo = {
      create: jest.fn().mockImplementation((value) => value),
      save: jest.fn().mockImplementation(async (entity) => {
        entity.id = 30;
        return entity;
      }),
    };
    categoryRepo = {
      findOne: jest.fn(),
    };
    userRepo = {
      findOne: jest.fn(),
    };
    documentTypeRepo = {
      findOne: jest.fn(),
    };
    areaCodeRepo = {
      findOne: jest.fn(),
    };
    searchService = {
      enqueueIndexDocument: jest.fn(),
    };
    workflowService = {
      ensureWorkflowForUpload: jest.fn(),
    };

    service = new DocumentsMutationService(
      documentRepo,
      versionRepo,
      categoryRepo,
      userRepo,
      documentTypeRepo,
      areaCodeRepo,
      searchService,
      workflowService,
    );
  });

  it('requires document type and area together on upload', async () => {
    await expect(
      service.upload({
        nombreDocumento: 'Procedimiento',
        storedName: 'file.pdf',
        originalName: 'file.pdf',
        documentTypeCode: 'PRO',
        uploadedById: 1,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates a document version and queues indexing on upload', async () => {
    const documentType = { id: 2, code: 'PRO' };
    const areaCode = { id: 3, code: 'RC' };
    const uploadedBy = { id: 1 };
    documentTypeRepo.findOne.mockResolvedValue(documentType);
    areaCodeRepo.findOne.mockResolvedValue(areaCode);
    userRepo.findOne.mockResolvedValue(uploadedBy);
    documentRepo.findOne.mockResolvedValue(null);

    const result = await service.upload({
      nombreDocumento: 'Procedimiento',
      storedName: 'stored.pdf',
      originalName: 'original.pdf',
      comentario: 'Inicial',
      documentTypeCode: 'PRO',
      areaCode: 'RC',
      uploadedById: 1,
    });

    expect(result).toEqual(
      expect.objectContaining({
        documentId: 20,
        versionId: 30,
        codigo: 'PRO-RC-05',
      }),
    );
    expect(workflowService.ensureWorkflowForUpload).toHaveBeenCalled();
    expect(searchService.enqueueIndexDocument).toHaveBeenCalledWith(20);
  });

  it('retries the generated code after a duplicate save error', async () => {
    const documentType = { id: 2, code: 'PRO' };
    const areaCode = { id: 3, code: 'RC' };
    documentTypeRepo.findOne.mockResolvedValue(documentType);
    areaCodeRepo.findOne.mockResolvedValue(areaCode);
    userRepo.findOne.mockResolvedValue({ id: 1 });
    documentRepo.findOne.mockResolvedValue(null);
    documentRepo.save = jest
      .fn()
      .mockRejectedValueOnce(new Error('duplicate key IDX_document_codigo'))
      .mockResolvedValueOnce({
        id: 21,
        nombre: 'Procedimiento',
        status: DocumentStatus.Draft,
        codigo: 'PRO-RC-06',
        consecutivo: 6,
      });
    documentRepo.createQueryBuilder = jest
      .fn()
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ max: 4 }),
      })
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ max: 5 }),
      });

    const result = await service.upload({
      nombreDocumento: 'Procedimiento',
      storedName: 'stored.pdf',
      originalName: 'original.pdf',
      documentTypeCode: 'PRO',
      areaCode: 'RC',
      uploadedById: 1,
    });

    expect(result.codigo).toBe('PRO-RC-06');
  });

  it('rejects an update when the target document does not exist', async () => {
    documentRepo.findOne.mockResolvedValue(null);

    await expect(service.update(999, 'Nuevo nombre')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('rejects a manual consecutive value that collides with another document', async () => {
    documentRepo.findOne
      .mockResolvedValueOnce({
        id: 33,
        nombre: 'Actual',
        category: null,
        documentType: { id: 2, code: 'PRO' },
        areaCode: { id: 3, code: 'RC' },
        consecutivo: 1,
      })
      .mockResolvedValueOnce({ id: 44, codigo: 'PRO-RC-02' });
    documentTypeRepo.findOne.mockResolvedValue({ id: 2, code: 'PRO' });
    areaCodeRepo.findOne.mockResolvedValue({ id: 3, code: 'RC' });

    await expect(
      service.update(33, undefined, undefined, 'PRO', 'RC', 2),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
