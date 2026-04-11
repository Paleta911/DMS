// src/documents/documents.controller.ts

import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  Body,
  UseGuards,
  BadRequestException,
  Get,
  Query,
  Param,
  Patch,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { diskStorage } from 'multer';
import { extname } from 'path';
import type { Request } from 'express';
import { existsSync, rmSync } from 'fs';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { DocumentsService } from './documents.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { ListDocumentsDto } from './dto/list-documents.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { AssignReviewersDto } from './dto/assign-reviewers.dto';
import { DecisionDto } from './dto/decision.dto';
import { ReprocessDocumentContentDto } from './dto/reprocess-document-content.dto';
import { AuditLogService } from '../audit-log/audit-log.service';
import { UsersService } from '../users/users.service';
import { UserRole } from '../users/user-role.enum';
import { UserScopeService } from '../users/user-scope.service';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ApprovalDecision, ApprovalStep } from './document-approval.entity';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionKey } from '../users/permissions';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import {
  throttleByUserIdOrIp,
  throttleFromEnv,
} from '../common/throttle.utils';
import {
  assertUploadMimeType,
  MAX_FILE_SIZE,
  sanitizeUploadOriginalName,
  UPLOAD_DIR,
} from './document-upload.policy';
const documentsUploadThrottle = throttleFromEnv(
  'DOCUMENT_UPLOAD_LIMIT',
  'DOCUMENT_UPLOAD_TTL_SEC',
  12,
  60,
  { getTracker: throttleByUserIdOrIp },
);

type AuthRequest = Request & { user: { id: number; role: UserRole } };

@ApiTags('documents')
@Controller('documents')
export class DocumentsController {
  constructor(
    private readonly documentsService: DocumentsService,
    private readonly auditLogService: AuditLogService,
    private readonly usersService: UsersService,
    private readonly userScopeService: UserScopeService,
  ) {}

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PermissionKey.Upload)
  @Throttle(documentsUploadThrottle)
  @Post('upload')
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'nombreDocumento'],
      properties: {
        file: { type: 'string', format: 'binary' },
        nombreDocumento: { type: 'string', example: 'Procedimiento Seguridad' },
        comentario: { type: 'string', example: 'Primera version' },
        categoryId: { type: 'number', example: 1 },
        isInternal: { type: 'boolean', example: true },
        documentId: { type: 'number', example: 101 },
        documentTypeCode: { type: 'string', example: 'PRO' },
        areaCode: { type: 'string', example: 'RC' },
        consecutivo: { type: 'number', example: 1 },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: UPLOAD_DIR,
        filename: (_req, file, cb) => {
          const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, unique + extname(file.originalname).toLowerCase());
        },
      }),
      limits: { fileSize: MAX_FILE_SIZE },
      fileFilter: (_req, file, cb) => {
        try {
          assertUploadMimeType({
            originalName: file.originalname,
            mimeType: file.mimetype,
          });
        } catch (error) {
          return cb(error as Error, false);
        }
        return cb(null, true);
      },
    }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: UploadDocumentDto,
    @Req() req: AuthRequest,
  ) {
    if (!file) {
      throw new BadRequestException('Archivo requerido');
    }

    const originalName = sanitizeUploadOriginalName(file.originalname);

    try {
      this.documentsService.assertUploadFileSignature({
        filePath: file.path,
        originalName,
        mimeType: file.mimetype,
      });

      if (body.documentId) {
        await this.usersService.ensurePermissions(req.user.id, [
          PermissionKey.UploadNewVersion,
        ]);
      }

      const textDetails = await this.documentsService.extractTextDetails({
        filePath: file.path,
        originalName,
        mimeType: file.mimetype,
      });

      const result = await this.documentsService.upload({
        nombreDocumento: body.nombreDocumento,
        storedName: file.filename,
        originalName,
        contentText: textDetails.contentText,
        textSource: textDetails.textSource,
        ocrApplied: textDetails.ocrApplied,
        ocrPageCount: textDetails.ocrPageCount,
        comentario: body.comentario,
        categoryId: body.categoryId,
        isInternal: body.isInternal,
        documentId: body.documentId,
        documentTypeCode: body.documentTypeCode,
        areaCode: body.areaCode,
        consecutivo: body.consecutivo,
        uploadedById: req.user.id,
      });

      await this.auditLogService.log({
        userId: req.user.id,
        action: 'DOCUMENT_UPLOAD',
        resourceType: 'document',
        resourceId: result.documentId,
        meta: {
          codigo: result.codigo,
          categoryId: body.categoryId ?? null,
          isInternal: body.isInternal ?? null,
          documentId: body.documentId ?? null,
          textSource: textDetails.textSource,
          ocrApplied: textDetails.ocrApplied,
          ocrPageCount: textDetails.ocrPageCount,
        },
        ip: req.ip,
        userAgent: req.headers['user-agent'] as string | undefined,
      });

      if (result.workflowReset) {
        await this.auditLogService.log({
          userId: req.user.id,
          action: 'WORKFLOW_RESET_ON_NEW_VERSION',
          resourceType: 'document',
          resourceId: result.documentId,
          meta: { codigo: result.codigo ?? null },
          ip: req.ip,
          userAgent: req.headers['user-agent'] as string | undefined,
        });
      }

      return result;
    } catch (error) {
      if (file.path && existsSync(file.path)) {
        rmSync(file.path, { force: true });
      }
      throw error;
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @Post('reprocess-content')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Reprocesa extracción de texto y OCR para documentos existentes',
  })
  async reprocessContent(
    @Body() body: ReprocessDocumentContentDto,
    @Req() req: AuthRequest,
  ) {
    const result = await this.documentsService.reprocessContent({
      documentId: body.documentId,
      force: body.force,
    });

    await this.auditLogService.log({
      userId: req.user.id,
      action: 'DOCUMENT_CONTENT_REPROCESS',
      resourceType: 'document',
      resourceId: body.documentId ?? null,
      meta: result,
      ip: req.ip,
      userAgent: req.headers['user-agent'] as string | undefined,
    });

    return result;
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PermissionKey.Read)
  @Get()
  @ApiBearerAuth()
  async list(@Query() query: ListDocumentsDto, @Req() req: AuthRequest) {
    return this.documentsService.list({
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      categoryId: query.categoryId,
      documentTypeCode: query.documentTypeCode,
      areaCode: query.areaCode,
      status: query.status,
      from: query.from,
      to: query.to,
      sortByName: query.sortByName,
      includeHiddenStatuses: req.user.role === UserRole.Admin,
    });
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PermissionKey.Read)
  @Get(':id')
  @ApiBearerAuth()
  async findOne(
    @Param('id') id: string,
    @Req() req: AuthRequest,
    @Query('versionsLimit') versionsLimit?: string,
  ) {
    const parsed = versionsLimit ? Number(versionsLimit) : 5;
    const limit = Number.isNaN(parsed) ? 5 : parsed;
    return this.userScopeService.runWithAccessDeniedAudit(
      {
        actor: req.user,
        resourceType: 'document',
        resourceId: id,
        endpoint: 'GET /documents/:id',
        ip: req.ip,
        userAgent: req.headers['user-agent'] as string | undefined,
      },
      async () =>
        this.documentsService.findOne(
          Number(id),
          limit,
          undefined,
          req.user.role === UserRole.Admin,
        ),
    );
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PermissionKey.Upload)
  @Patch(':id')
  @ApiBearerAuth()
  async update(@Param('id') id: string, @Body() body: UpdateDocumentDto, @Req() req: AuthRequest) {
    return this.userScopeService.runWithAccessDeniedAudit(
      {
        actor: req.user,
        resourceType: 'document',
        resourceId: id,
        endpoint: 'PATCH /documents/:id',
        ip: req.ip,
        userAgent: req.headers['user-agent'] as string | undefined,
      },
      async () => {
        await this.documentsService.ensureAccess(
          Number(id),
          undefined,
          req.user.role === UserRole.Admin,
        );

        const categoryId = body.categoryId === null ? null : body.categoryId;
        const updated = await this.documentsService.update(
          Number(id),
          body.nombreDocumento,
          categoryId,
          body.isInternal,
          body.documentTypeCode,
          body.areaCode,
          body.consecutivo ?? undefined,
        );

        await this.auditLogService.log({
          userId: req.user.id,
          action: 'DOCUMENT_UPDATE',
          resourceType: 'document',
          resourceId: updated.id,
          meta: {
            codigo: updated.codigo ?? null,
            categoryId: updated.category?.id ?? null,
            isInternal: updated.isInternal,
          },
          ip: req.ip,
          userAgent: req.headers['user-agent'] as string | undefined,
        });

        return updated;
      },
    );
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PermissionKey.Read)
  @Get(':id/versions')
  @ApiBearerAuth()
  async listVersions(@Param('id') id: string, @Req() req: AuthRequest) {
    return this.userScopeService.runWithAccessDeniedAudit(
      {
        actor: req.user,
        resourceType: 'document',
        resourceId: id,
        endpoint: 'GET /documents/:id/versions',
        ip: req.ip,
        userAgent: req.headers['user-agent'] as string | undefined,
      },
      async () =>
        this.documentsService.findVersionsByDocument(
          Number(id),
          undefined,
          req.user.role === UserRole.Admin,
        ),
    );
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PermissionKey.Read)
  @Get(':id/workflow')
  @ApiBearerAuth()
  async getWorkflow(@Param('id') id: string, @Req() req: AuthRequest) {
    return this.userScopeService.runWithAccessDeniedAudit(
      {
        actor: req.user,
        resourceType: 'workflow',
        resourceId: id,
        endpoint: 'GET /documents/:id/workflow',
        ip: req.ip,
        userAgent: req.headers['user-agent'] as string | undefined,
      },
      async () => {
        await this.documentsService.ensureAccess(
          Number(id),
          undefined,
          req.user.role === UserRole.Admin,
        );
        return this.documentsService.getWorkflow(Number(id));
      },
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @Patch(':id/assign-reviewers')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Assign reviewer and approver' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['revisoUserId', 'aproboUserId'],
      properties: {
        revisoUserId: { type: 'number', example: 2 },
        aproboUserId: { type: 'number', example: 3 },
      },
    },
  })
  async assignReviewers(
    @Param('id') id: string,
    @Body() body: AssignReviewersDto,
    @Req() req: AuthRequest,
  ) {
    const result = await this.documentsService.assignReviewers(
      Number(id),
      body.revisoUserId,
      body.aproboUserId,
    );
    await this.auditLogService.log({
      userId: req.user.id,
      action: 'WORKFLOW_ASSIGN',
      resourceType: 'document',
      resourceId: id,
      meta: {
        revisoUserId: body.revisoUserId,
        aproboUserId: body.aproboUserId,
      },
      ip: req.ip,
      userAgent: req.headers['user-agent'] as string | undefined,
    });
    return result;
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PermissionKey.Upload)
  @Post(':id/submit-review')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit document for review' })
  async submitReview(@Param('id') id: string, @Req() req: AuthRequest) {
    const isAdmin = req.user.role === UserRole.Admin;
    return this.userScopeService.runWithAccessDeniedAudit(
      {
        actor: req.user,
        resourceType: 'workflow',
        resourceId: id,
        endpoint: 'POST /documents/:id/submit-review',
        ip: req.ip,
        userAgent: req.headers['user-agent'] as string | undefined,
      },
      async () => {
        await this.documentsService.ensureAccess(Number(id), undefined, isAdmin);
        const result = await this.documentsService.submitReview(
          Number(id),
          req.user.id,
          isAdmin,
        );
        await this.auditLogService.log({
          userId: req.user.id,
          action: 'WORKFLOW_SUBMIT',
          resourceType: 'document',
          resourceId: id,
          ip: req.ip,
          userAgent: req.headers['user-agent'] as string | undefined,
        });
        return result;
      },
    );
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PermissionKey.Review)
  @Post(':id/review')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reviewer decision' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['decision'],
      properties: {
        decision: { type: 'string', example: 'APPROVED' },
        comentario: { type: 'string', example: 'OK' },
      },
    },
  })
  async reviewDecision(
    @Param('id') id: string,
    @Body() body: DecisionDto,
    @Req() req: AuthRequest,
  ) {
    return this.userScopeService.runWithAccessDeniedAudit(
      {
        actor: req.user,
        resourceType: 'workflow',
        resourceId: id,
        endpoint: 'POST /documents/:id/review',
        ip: req.ip,
        userAgent: req.headers['user-agent'] as string | undefined,
      },
      async () => {
        await this.documentsService.ensureAccess(
          Number(id),
          undefined,
          req.user.role === UserRole.Admin,
        );
        const result = await this.documentsService.reviewDecision({
          documentId: Number(id),
          actorId: req.user.id,
          decision:
            body.decision === 'APPROVED'
              ? ApprovalDecision.Approved
              : ApprovalDecision.Rejected,
          comentario: body.comentario,
          step: ApprovalStep.Reviso,
        });
        await this.auditLogService.log({
          userId: req.user.id,
          action: 'WORKFLOW_REVIEW_DECISION',
          resourceType: 'document',
          resourceId: id,
          meta: { decision: body.decision },
          ip: req.ip,
          userAgent: req.headers['user-agent'] as string | undefined,
        });
        return result;
      },
    );
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PermissionKey.Approve)
  @Post(':id/approve')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approver decision' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['decision'],
      properties: {
        decision: { type: 'string', example: 'APPROVED' },
        comentario: { type: 'string', example: 'OK' },
      },
    },
  })
  async approveDecision(
    @Param('id') id: string,
    @Body() body: DecisionDto,
    @Req() req: AuthRequest,
  ) {
    return this.userScopeService.runWithAccessDeniedAudit(
      {
        actor: req.user,
        resourceType: 'workflow',
        resourceId: id,
        endpoint: 'POST /documents/:id/approve',
        ip: req.ip,
        userAgent: req.headers['user-agent'] as string | undefined,
      },
      async () => {
        await this.documentsService.ensureAccess(
          Number(id),
          undefined,
          req.user.role === UserRole.Admin,
        );
        const result = await this.documentsService.reviewDecision({
          documentId: Number(id),
          actorId: req.user.id,
          decision:
            body.decision === 'APPROVED'
              ? ApprovalDecision.Approved
              : ApprovalDecision.Rejected,
          comentario: body.comentario,
          step: ApprovalStep.Aprobo,
        });
        await this.auditLogService.log({
          userId: req.user.id,
          action: 'WORKFLOW_APPROVAL_DECISION',
          resourceType: 'document',
          resourceId: id,
          meta: { decision: body.decision },
          ip: req.ip,
          userAgent: req.headers['user-agent'] as string | undefined,
        });
        return result;
      },
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Permissions(PermissionKey.Delete)
  @Roles(UserRole.Admin)
  @Post(':id/obsolete')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark document as obsolete' })
  async markObsolete(@Param('id') id: string, @Req() req: AuthRequest) {
    const result = await this.documentsService.markObsolete(Number(id));
    await this.auditLogService.log({
      userId: req.user.id,
      action: 'WORKFLOW_STATUS_CHANGE',
      resourceType: 'document',
      resourceId: id,
      meta: { status: 'OBSOLETE' },
      ip: req.ip,
      userAgent: req.headers['user-agent'] as string | undefined,
    });
    return result;
  }
}
