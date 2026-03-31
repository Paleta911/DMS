import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { AuditLog } from './audit-log.entity';
import { getRequestId } from '../common/request-context';
import { AuditAction } from './audit-log.types';

@Injectable()
export class AuditLogWriteService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
  ) {}

  async log(
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
    const requestId = getRequestId();
    const meta =
      requestId || params.meta
        ? {
            ...(params.meta ?? {}),
            ...(requestId ? { requestId } : {}),
          }
        : undefined;
    const repo = manager ? manager.getRepository(AuditLog) : this.auditRepo;
    const entry = repo.create({
      userId: params.userId ?? null,
      action: params.action,
      resourceType: params.resourceType,
      resourceId:
        params.resourceId === undefined || params.resourceId === null
          ? null
          : String(params.resourceId),
      meta: meta ? JSON.stringify(meta) : null,
      ip: params.ip ?? null,
      userAgent: params.userAgent ?? null,
    });
    await repo.save(entry);
  }
}
