import { Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { AuditLogService } from './audit-log.service';
import { AuditAction } from './audit-log.types';

type RequestWithUser = Request & { user?: { id?: number } };

@Injectable()
export class HttpAuditService {
  constructor(private readonly auditLogService: AuditLogService) {}

  async logFromRequest(
    req: RequestWithUser,
    params: {
      action: AuditAction;
      resourceType: string;
      resourceId?: string | number | null;
      meta?: Record<string, unknown>;
    },
  ) {
    await this.auditLogService.log({
      userId: req.user?.id,
      action: params.action,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      meta: params.meta,
      ip: req.ip,
      userAgent: req.headers['user-agent'] as string | undefined,
    });
  }
}
