// src/versions/versions.controller.ts

import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  UseGuards,
  Res,
  Req,
} from '@nestjs/common';
import type { Response } from 'express';
import { existsSync } from 'fs';
import { join } from 'path';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { VersionsService } from './versions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateVersionDto } from './dto/create-version.dto';
import { AuditLogService } from '../audit-log/audit-log.service';
import type { Request } from 'express';
import { UserRole } from '../users/user-role.enum';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionKey } from '../users/permissions';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { buildApiErrorResponse } from '../common/http-error.utils';
import { UPLOAD_DIR } from '../documents/document-upload.policy';
import { DocumentVisibilityService } from '../document-visibility/document-visibility.service';

@ApiTags('versions')
@Controller('versions')
export class VersionsController {
  constructor(
    private readonly versionsService: VersionsService,
    private readonly auditLogService: AuditLogService,
    private readonly documentVisibilityService: DocumentVisibilityService,
  ) {}

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PermissionKey.UploadNewVersion)
  @Post()
  @ApiBearerAuth()
  async create(
    @Body() body: CreateVersionDto,
    @Req() req: Request & { user?: { id: number; role: UserRole } },
  ) {
    const isAdmin = req.user?.role === UserRole.Admin;
    const documentStatus = await this.versionsService.findDocumentStatus(
      body.documentId,
    );
    await this.documentVisibilityService.assertDocumentVisible(
      documentStatus,
      isAdmin,
    );

    return this.versionsService.create(
      {
        documentId: body.documentId,
        storedName: body.storedName,
        originalName: body.originalName,
        comentario: body.comentario,
        uploadedById: req.user?.id,
      },
    );
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PermissionKey.Read)
  @Get(':documentId')
  @ApiBearerAuth()
  async findByDocument(
    @Param('documentId') documentId: string,
    @Req() req: Request & { user?: { id: number; role: UserRole } },
  ) {
    const isAdmin = req.user?.role === UserRole.Admin;
    const documentStatus = await this.versionsService.findDocumentStatus(
      Number(documentId),
    );
    await this.documentVisibilityService.assertDocumentVisible(
      documentStatus,
      isAdmin,
    );
    return this.versionsService.findByDocument(Number(documentId));
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PermissionKey.Read)
  @Get(':id/download')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Download version file' })
  async download(
    @Param('id') id: string,
    @Res() res: Response,
    @Req() req: Request & { user?: { id: number; role: UserRole } },
  ) {
    const version = await this.versionsService.findById(Number(id));
    const isAdmin = req.user?.role === UserRole.Admin;
    if (version.document?.status) {
      await this.documentVisibilityService.assertDocumentVisible(
        version.document.status,
        isAdmin,
      );
    }
    const filePath = join(UPLOAD_DIR, version.storedName);
    if (!existsSync(filePath)) {
      return res.status(404).json(
        buildApiErrorResponse({
          statusCode: 404,
          error: 'No encontrado',
          message: 'Archivo no encontrado',
          request: req as Request & { requestId?: string },
        }),
      );
    }

    await this.auditLogService.log({
      userId: req.user?.id ?? null,
      action: 'VERSION_DOWNLOAD',
      resourceType: 'version',
      resourceId: version.id,
      meta: { documentId: version.document?.id ?? null },
      ip: req.ip,
      userAgent: req.headers['user-agent'] as string | undefined,
    });

    return res.download(filePath, version.originalName);
  }
}
