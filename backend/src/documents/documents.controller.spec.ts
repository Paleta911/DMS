import { Test, TestingModule } from '@nestjs/testing';
jest.mock('fs', () => {
  const actual = jest.requireActual('fs');
  return {
    ...actual,
    existsSync: jest.fn(actual.existsSync),
    rmSync: jest.fn(),
  };
});

import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { UsersService } from '../users/users.service';
import { UserScopeService } from '../users/user-scope.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import { PERMISSIONS_KEY } from '../auth/permissions.decorator';
import { PermissionKey } from '../users/permissions';
import { ROLES_KEY } from '../auth/roles.decorator';
import { UserRole } from '../users/user-role.enum';

describe('DocumentsController', () => {
  let controller: DocumentsController;
  const documentsService = {
    assertUploadFileSignature: jest.fn(),
    extractContentText: jest.fn(),
    extractTextDetails: jest.fn(),
    upload: jest.fn(),
    reprocessContent: jest.fn(),
  };
  const auditLogService = { log: jest.fn() };
  const usersService = { ensurePermissions: jest.fn() };
  const userScopeService = { assertAreaAccess: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DocumentsController],
      providers: [
        {
          provide: DocumentsService,
          useValue: documentsService,
        },
        {
          provide: AuditLogService,
          useValue: auditLogService,
        },
        {
          provide: UsersService,
          useValue: usersService,
        },
        {
          provide: UserScopeService,
          useValue: userScopeService,
        },
        {
          provide: JwtAuthGuard,
          useValue: { canActivate: () => true },
        },
        {
          provide: PermissionsGuard,
          useValue: { canActivate: () => true },
        },
        {
          provide: RolesGuard,
          useValue: { canActivate: () => true },
        },
      ],
    }).compile();

    controller = module.get<DocumentsController>(DocumentsController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('declara permisos de carga para enviar a revision', () => {
    const permissions = Reflect.getMetadata(
      PERMISSIONS_KEY,
      DocumentsController.prototype.submitReview,
    );

    expect(permissions).toEqual([PermissionKey.Upload]);
  });

  it('declara rol admin para asignar revisores', () => {
    const roles = Reflect.getMetadata(
      ROLES_KEY,
      DocumentsController.prototype.assignReviewers,
    );

    expect(roles).toEqual([UserRole.Admin]);
  });

  it('elimina el archivo temporal si falla la validacion posterior al upload', async () => {
    const rmSpy = fs.rmSync as jest.Mock;
    const existsSpy = fs.existsSync as jest.Mock;
    existsSpy.mockReturnValue(true);
    documentsService.assertUploadFileSignature.mockImplementationOnce(() => {
      throw new BadRequestException('Archivo PDF invalido o dañado');
    });

    await expect(
      controller.upload(
        {
          filename: 'stored.pdf',
          originalname: 'test.pdf',
          path: 'C:\\temp\\stored.pdf',
          mimetype: 'application/pdf',
        } as Express.Multer.File,
        {
          nombreDocumento: 'Doc de prueba',
          areaCode: 'RC',
          documentTypeCode: 'PRO',
        },
        {
          ip: '127.0.0.1',
          headers: {},
          user: { id: 1, role: 'admin' },
        } as never,
      ),
    ).rejects.toThrow('Archivo PDF invalido o dañado');

    expect(existsSpy).toHaveBeenCalledWith('C:\\temp\\stored.pdf');
    expect(rmSpy).toHaveBeenCalledWith('C:\\temp\\stored.pdf', { force: true });
  });

  it('mantiene el nombre original saneado cuando sube correctamente', async () => {
    documentsService.extractTextDetails.mockResolvedValue({
      contentText: 'contenido',
      textSource: 'PDF_TEXT',
      ocrApplied: false,
      ocrPageCount: null,
    });
    documentsService.upload.mockResolvedValue({
      documentId: 10,
      versionId: 20,
      codigo: 'PRO-RC-01',
      workflowReset: false,
    });

    await controller.upload(
      {
        filename: 'stored.pdf',
        originalname: 'C:\\fakepath\\manual.pdf',
        path: 'C:\\temp\\stored.pdf',
        mimetype: 'application/pdf',
      } as Express.Multer.File,
      {
        nombreDocumento: 'Manual',
        areaCode: 'RC',
        documentTypeCode: 'PRO',
      },
      {
        ip: '127.0.0.1',
        headers: {},
        user: { id: 1, role: 'admin' },
      } as never,
    );

    expect(documentsService.upload).toHaveBeenCalledWith(
      expect.objectContaining({
        originalName: 'manual.pdf',
        textSource: 'PDF_TEXT',
        ocrApplied: false,
      }),
    );
    expect(userScopeService.assertAreaAccess).not.toHaveBeenCalled();
  });

  it('permite reprocesar contenido de documentos como admin', async () => {
    documentsService.reprocessContent.mockResolvedValue({
      processed: 4,
      updated: 3,
      skipped: 1,
      missingFiles: 0,
      reindexedDocuments: 2,
      force: true,
      documentId: null,
    });

    const result = await controller.reprocessContent(
      { force: true },
      {
        ip: '127.0.0.1',
        headers: {},
        user: { id: 1, role: 'admin' },
      } as never,
    );

    expect(documentsService.reprocessContent).toHaveBeenCalledWith({
      documentId: undefined,
      force: true,
    });
    expect(auditLogService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'DOCUMENT_CONTENT_REPROCESS',
        resourceType: 'document',
      }),
    );
    expect(result.updated).toBe(3);
  });
});
