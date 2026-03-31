import { AreaCodesController } from '../../../backend/src/area-codes/area-codes.controller';
import { DocumentTypesController } from '../../../backend/src/document-types/document-types.controller';

describe('Catalog controllers external tests', () => {
  const httpAuditService = {
    logFromRequest: jest.fn(),
  };

  const areaCodesService = {
    findAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const documentTypesService = {
    findAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const areaController = new AreaCodesController(areaCodesService as any, httpAuditService as any);
  const docTypeController = new DocumentTypesController(documentTypesService as any, httpAuditService as any);

  beforeEach(() => jest.clearAllMocks());

  it('maps findAll query for area codes', async () => {
    areaCodesService.findAll.mockResolvedValue({ items: [] });
    await areaController.findAll({ q: 'fa', includeInactive: true, page: 2, limit: 5 } as any);
    expect(areaCodesService.findAll).toHaveBeenCalledWith({ q: 'fa', includeInactive: true, page: 2, limit: 5 });
  });

  it('audits area code create/update/remove', async () => {
    areaCodesService.create.mockResolvedValue({ id: 1, code: 'FA', nombre: 'Finanzas' });
    areaCodesService.update.mockResolvedValue({ id: 1, code: 'FA', nombre: 'Finanzas 2' });
    areaCodesService.remove.mockResolvedValue({ success: true });
    const req = { user: { id: 1 } } as any;

    await areaController.create({ code: 'FA', nombre: 'Finanzas' } as any, req);
    await areaController.update(1, { nombre: 'Finanzas 2' } as any, req);
    await areaController.remove(1, req);

    expect(httpAuditService.logFromRequest).toHaveBeenNthCalledWith(1, req, expect.objectContaining({ action: 'AREA_CODE_CREATED', resourceId: 1 }));
    expect(httpAuditService.logFromRequest).toHaveBeenNthCalledWith(2, req, expect.objectContaining({ action: 'AREA_CODE_UPDATED', resourceId: 1 }));
    expect(httpAuditService.logFromRequest).toHaveBeenNthCalledWith(3, req, expect.objectContaining({ action: 'AREA_CODE_DEACTIVATED', resourceId: 1 }));
  });

  it('maps findAll query for document types', async () => {
    documentTypesService.findAll.mockResolvedValue({ items: [] });
    await docTypeController.findAll({ q: 'pro', includeInactive: false, page: 1, limit: 25 } as any);
    expect(documentTypesService.findAll).toHaveBeenCalledWith({ q: 'pro', includeInactive: false, page: 1, limit: 25 });
  });

  it('audits document type create/update/remove', async () => {
    documentTypesService.create.mockResolvedValue({ id: 2, code: 'PRO', nombreLargo: 'Procedimiento' });
    documentTypesService.update.mockResolvedValue({ id: 2, code: 'PRO', nombreLargo: 'Procedimiento 2' });
    documentTypesService.remove.mockResolvedValue({ success: true });
    const req = { user: { id: 1 } } as any;

    await docTypeController.create({ code: 'PRO', nombreLargo: 'Procedimiento' } as any, req);
    await docTypeController.update(2, { nombreLargo: 'Procedimiento 2' } as any, req);
    await docTypeController.remove(2, req);

    expect(httpAuditService.logFromRequest).toHaveBeenNthCalledWith(1, req, expect.objectContaining({ action: 'DOCUMENT_TYPE_CREATED', resourceId: 2 }));
    expect(httpAuditService.logFromRequest).toHaveBeenNthCalledWith(2, req, expect.objectContaining({ action: 'DOCUMENT_TYPE_UPDATED', resourceId: 2 }));
    expect(httpAuditService.logFromRequest).toHaveBeenNthCalledWith(3, req, expect.objectContaining({ action: 'DOCUMENT_TYPE_DEACTIVATED', resourceId: 2 }));
  });
});
