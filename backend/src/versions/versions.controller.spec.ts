jest.mock('fs', () => {
  const actual = jest.requireActual('fs');
  return {
    ...actual,
    existsSync: jest.fn(actual.existsSync),
  };
});

import { Test, TestingModule } from '@nestjs/testing';
import * as fs from 'fs';
import { VersionsController } from './versions.controller';
import { VersionsService } from './versions.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { PermissionKey } from '../users/permissions';
import { PERMISSIONS_KEY } from '../auth/permissions.decorator';
import { UserRole } from '../users/user-role.enum';
import { DocumentStatus } from '../documents/document-status.enum';
import { DocumentVisibilityService } from '../document-visibility/document-visibility.service';

describe('VersionsController', () => {
  let controller: VersionsController;

  const versionsService = {
    create: jest.fn(),
    findByDocument: jest.fn(),
    findById: jest.fn(),
    findDocumentStatus: jest.fn(),
  };
  const auditLogService = { log: jest.fn() };
  const documentVisibilityService = {
    assertDocumentVisible: jest.fn(),
  };

  beforeEach(async () => {
    const builder = Test.createTestingModule({
      controllers: [VersionsController],
      providers: [
        { provide: VersionsService, useValue: versionsService },
        { provide: AuditLogService, useValue: auditLogService },
        {
          provide: DocumentVisibilityService,
          useValue: documentVisibilityService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true });

    const module: TestingModule = await builder.compile();

    controller = module.get<VersionsController>(VersionsController);
    jest.clearAllMocks();
    versionsService.findDocumentStatus.mockResolvedValue(DocumentStatus.Draft);
    documentVisibilityService.assertDocumentVisible.mockResolvedValue(
      undefined,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('declara permisos correctos para crear version', () => {
    const permissions = Reflect.getMetadata(
      PERMISSIONS_KEY,
      VersionsController.prototype.create,
    );

    expect(permissions).toEqual([PermissionKey.UploadNewVersion]);
  });

  it('crea una nueva version sin validar area del usuario', async () => {
    versionsService.create.mockResolvedValue({ id: 10, documentId: 42 });

    const req = {
      ip: '127.0.0.1',
      headers: { 'user-agent': 'jest' },
      user: { id: 7, role: UserRole.User },
    } as never;

    const result = await controller.create(
      {
        documentId: 42,
        storedName: 'v2.pdf',
        originalName: 'manual-v2.pdf',
        comentario: 'Nueva version',
      },
      req,
    );

    expect(versionsService.create).toHaveBeenCalledWith({
      documentId: 42,
      storedName: 'v2.pdf',
      originalName: 'manual-v2.pdf',
      comentario: 'Nueva version',
      uploadedById: 7,
    });
    expect(documentVisibilityService.assertDocumentVisible).toHaveBeenCalledWith(
      DocumentStatus.Draft,
      false,
    );
    expect(result).toEqual({ id: 10, documentId: 42 });
  });

  it('declara permisos de lectura para listar versiones', () => {
    const permissions = Reflect.getMetadata(
      PERMISSIONS_KEY,
      VersionsController.prototype.findByDocument,
    );

    expect(permissions).toEqual([PermissionKey.Read]);
  });

  it('lista versiones por documento sin validar area en lectura', async () => {
    versionsService.findByDocument.mockResolvedValue([{ id: 1 }]);

    const req = {
      ip: '127.0.0.1',
      headers: { 'user-agent': 'jest' },
      user: { id: 7, role: UserRole.User },
    } as never;

    const result = await controller.findByDocument('42', req);

    expect(versionsService.findDocumentStatus).toHaveBeenCalledWith(42);
    expect(documentVisibilityService.assertDocumentVisible).toHaveBeenCalledWith(
      DocumentStatus.Draft,
      false,
    );
    expect(versionsService.findByDocument).toHaveBeenCalledWith(42);
    expect(result).toEqual([{ id: 1 }]);
  });

  it('devuelve 404 uniforme si falta el archivo al descargar', async () => {
    const existsSpy = fs.existsSync as jest.Mock;
    existsSpy.mockReturnValue(false);
    versionsService.findById.mockResolvedValue({
      id: 99,
      storedName: 'faltante.pdf',
      originalName: 'faltante.pdf',
      document: { id: 42, areaCode: { code: 'RC' } },
    });
    const response = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      download: jest.fn(),
    };
    const req = {
      ip: '127.0.0.1',
      headers: { 'user-agent': 'jest' },
      originalUrl: '/versions/99/download',
      requestId: 'req-1',
      user: { id: 7, role: UserRole.User },
    } as never;

    await controller.download('99', response as never, req);

    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 404,
        message: 'Archivo no encontrado',
        requestId: 'req-1',
      }),
    );
    expect(auditLogService.log).not.toHaveBeenCalled();
  });

  it('audita y descarga el archivo cuando existe', async () => {
    const existsSpy = fs.existsSync as jest.Mock;
    existsSpy.mockReturnValue(true);
    versionsService.findById.mockResolvedValue({
      id: 120,
      storedName: 'v120.pdf',
      originalName: 'manual.pdf',
      document: { id: 12, areaCode: { code: 'RC' } },
    });
    const response = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      download: jest.fn(),
    };
    const req = {
      ip: '127.0.0.1',
      headers: { 'user-agent': 'jest' },
      user: { id: 7, role: UserRole.User },
    } as never;

    await controller.download('120', response as never, req);

    expect(auditLogService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 7,
        action: 'VERSION_DOWNLOAD',
        resourceId: 120,
      }),
    );
    expect(response.download).toHaveBeenCalledWith(
      expect.stringContaining('v120.pdf'),
      'manual.pdf',
    );
  });
});
