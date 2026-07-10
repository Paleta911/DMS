import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { AuditLogWriteService } from './audit-log-write.service';
import { AuditLogQueryService } from './audit-log-query.service';
import { AuditAction, AuditLogFilterParams } from './audit-log.types';

export type { AuditAction } from './audit-log.types';

@Injectable()
export class AuditLogService {
  constructor(
    private readonly auditLogWriteService: AuditLogWriteService,
    private readonly auditLogQueryService: AuditLogQueryService,
  ) {}

  log(
    params: {
      userId?: number | null;
      action: AuditAction;
      resourceType: string;
      resourceId?: string | number | null;
      meta?: Record<string, unknown>;
      ip?: string;
      userAgent?: string;
    },
    manager?: EntityManager,
  ) {
    // Write path is isolated to keep audit persistence rules centralized.
    return this.auditLogWriteService.log(params, manager);
  }

  query(params: AuditLogFilterParams) {
    return this.auditLogQueryService.query(params);
  }

  exportCsv(params: AuditLogFilterParams) {
    return this.auditLogQueryService.exportCsv(params);
  }

  exportJson(params: AuditLogFilterParams) {
    return this.auditLogQueryService.exportJson(params);
  }
}
