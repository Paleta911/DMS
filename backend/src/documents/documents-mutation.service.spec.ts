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

  it('requires type, area and consecutive for internal uploads', async () => {
    await expect(
      service.upload({
        nombreDocumento: 'Procedimiento',
        storedName: 'file.pdf',
        originalName: 'file.pdf',
        isInternal: true,
        documentTypeCode: 'PRO',
        uploadedById: 1,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('allows external uploads without code generation', async () => {
    const areaCode = { id: 3, code: 'RC' };
    areaCodeRepo.findOne.mockResolvedValue(areaCode);
    userRepo.findOne.mockResolvedValue({ id: 1 });

    const result = await service.upload({
      nombreDocumento: 'Documento externo',
      storedName: 'stored.pdf',
      originalName: 'original.pdf',
      areaCode: 'RC',
      uploadedById: 1,
    });

    expect(result).toEqual(
      expect.objectContaining({
        documentId: 20,
        versionId: 30,
        codigo: null,
      }),
    );
    expect(documentRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        isInternal: false,
        areaCode,
        documentType: null,
        consecutivo: null,
        codigo: null,
      }),
    );
  });

  it('creates an internal document with manual code and queues indexing on upload', async () => {
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
      isInternal: true,
      documentTypeCode: 'PRO',
      areaCode: 'RC',
      consecutivo: 5,
      uploadedById: 1,
    });

    expect(result).toEqual(
      expect.objectContaining({
        documentId: 20,
        versionId: 30,
        codigo: 'CEP-PRO-RC-05',
      }),
    );
    expect(workflowService.ensureWorkflowForUpload).toHaveBeenCalled();
    expect(searchService.enqueueIndexDocument).toHaveBeenCalledWith(20);
  });

  it('rejects internal uploads when the code already exists', async () => {
    const documentType = { id: 2, code: 'PRO' };
    const areaCode = { id: 3, code: 'RC' };
    documentTypeRepo.findOne.mockResolvedValue(documentType);
    areaCodeRepo.findOne.mockResolvedValue(areaCode);
    userRepo.findOne.mockResolvedValue({ id: 1 });
    documentRepo.findOne.mockResolvedValue({ id: 99, codigo: 'CEP-PRO-RC-05' });

    await expect(
      service.upload({
        nombreDocumento: 'Procedimiento',
        storedName: 'stored.pdf',
        originalName: 'original.pdf',
        isInternal: true,
        documentTypeCode: 'PRO',
        areaCode: 'RC',
        consecutivo: 5,
        uploadedById: 1,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('uploads a new version only when documentId is provided', async () => {
    const existingDocument = {
      id: 44,
      nombreDocumento: 'Procedimiento',
      nombre: 'Procedimiento',
      status: DocumentStatus.Approved,
      isInternal: true,
      codigo: 'CEP-PRO-RC-05',
      consecutivo: 5,
      documentType: { id: 2, code: 'PRO' },
      areaCode: { id: 3, code: 'RC' },
      category: null,
      approvals: [],
    };
    documentRepo.findOne.mockResolvedValue(existingDocument);
    userRepo.findOne.mockResolvedValue({ id: 1 });

    const result = await service.upload({
      documentId: 44,
      nombreDocumento: 'Procedimiento',
      storedName: 'stored.pdf',
      originalName: 'original.pdf',
      categoryId: 1,
      comentario: 'Nueva versión',
      uploadedById: 1,
    });

    expect(result).toEqual(
      expect.objectContaining({
        documentId: 44,
        versionId: 30,
        codigo: 'CEP-PRO-RC-05',
        workflowReset: true,
      }),
    );
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
        isInternal: true,
        category: null,
        documentType: { id: 2, code: 'PRO' },
        areaCode: { id: 3, code: 'RC' },
        consecutivo: 1,
      })
      .mockResolvedValueOnce({ id: 44, codigo: 'CEP-PRO-RC-02' });
    documentTypeRepo.findOne.mockResolvedValue({ id: 2, code: 'PRO' });
    areaCodeRepo.findOne.mockResolvedValue({ id: 3, code: 'RC' });

    await expect(
      service.update(33, undefined, undefined, true, 'PRO', 'RC', 2),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('clears code fields when a document stops being internal', async () => {
    documentRepo.findOne.mockResolvedValue({
      id: 33,
      nombre: 'Actual',
      isInternal: true,
      category: null,
      documentType: { id: 2, code: 'PRO' },
      areaCode: { id: 3, code: 'RC' },
      consecutivo: 2,
      codigo: 'CEP-PRO-RC-02',
    });

    const result = await service.update(
      33,
      undefined,
      undefined,
      false,
      undefined,
      undefined,
      null,
    );

    expect(result).toEqual(
      expect.objectContaining({
        isInternal: false,
        documentType: null,
        consecutivo: null,
        codigo: null,
      }),
    );
  });
});
