import {
  Body,
  Controller,
  Get,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AuditLogService } from '../audit-log/audit-log.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user-role.enum';
import { DocumentVisibilityService } from './document-visibility.service';
import { UpdateDocumentVisibilityDto } from './dto/update-document-visibility.dto';

@ApiTags('document-visibility')
@Controller('document-visibility')
export class DocumentVisibilityController {
  constructor(
    private readonly documentVisibilityService: DocumentVisibilityService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @Get()
  @ApiBearerAuth()
  getPolicy() {
    return this.documentVisibilityService.getPolicy();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @Patch()
  @ApiBearerAuth()
  async updatePolicy(
    @Body() body: UpdateDocumentVisibilityDto,
    @Req() req: Request & { user?: { id: number } },
  ) {
    const updated = await this.documentVisibilityService.updatePolicy(body);

    await this.auditLogService.log({
      userId: req.user?.id ?? null,
      action: 'DOCUMENT_VISIBILITY_POLICY_UPDATED',
      resourceType: 'document_visibility',
      resourceId: 1,
      meta: {
        ...body,
      },
      ip: req.ip,
      userAgent: req.headers['user-agent'] as string | undefined,
    });

    return updated;
  }
}
