import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { AuditLog } from './audit-log.entity';
import { AuditLogFilterParams } from './audit-log.types';

@Injectable()
export class AuditLogQueryService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
  ) {}

  async query(params: AuditLogFilterParams) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const skip = (page - 1) * limit;

    const qb = this.buildQuery(params).skip(skip).take(limit);
    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit };
  }

  async exportCsv(params: AuditLogFilterParams) {
    const maxRows = Math.min(Math.max(params.maxRows ?? 5000, 1), 10000);
    const items = await this.buildQuery(params).take(maxRows).getMany();

    const headers = [
      'fecha',
      'usuarioId',
      'accion',
      'tipo',
      'recursoId',
      'ip',
      'agenteUsuario',
      'meta',
    ];

    const lines = items.map((item) =>
      [
        item.createdAt.toISOString(),
        item.userId ?? '',
        item.action,
        item.resourceType,
        item.resourceId ?? '',
        item.ip ?? '',
        item.userAgent ?? '',
        item.meta ?? '',
      ]
        .map((value) => this.toCsvCell(value))
        .join(','),
    );

    return [headers.map((header) => this.toCsvCell(header)).join(','), ...lines].join('\n');
  }

  async exportJson(params: AuditLogFilterParams) {
    const maxRows = Math.min(Math.max(params.maxRows ?? 5000, 1), 10000);
    const items = await this.buildQuery(params).take(maxRows).getMany();

    return items.map((item) => ({
      id: item.id,
      fecha: item.createdAt.toISOString(),
      usuarioId: item.userId,
      accion: item.action,
      tipo: item.resourceType,
      recursoId: item.resourceId,
      ip: item.ip,
      agenteUsuario: item.userAgent,
      meta: item.meta,
    }));
  }

  private buildQuery(params: AuditLogFilterParams): SelectQueryBuilder<AuditLog> {
    const qb = this.auditRepo
      .createQueryBuilder('audit')
      .orderBy('audit.createdAt', 'DESC');

    if (params.action) {
      qb.andWhere('audit.action = :action', { action: params.action });
    }

    if (params.user?.trim()) {
      const userFilter = `%${params.user.trim().toLowerCase()}%`;
      qb.andWhere(
        '(CAST(audit.userId AS varchar(30)) LIKE :userFilter OR LOWER(COALESCE(audit.meta, \'\')) LIKE :userFilter)',
        { userFilter },
      );
    }

    if (params.q?.trim()) {
      const queryFilter = `%${params.q.trim().toLowerCase()}%`;
      qb.andWhere(
        `(
          LOWER(audit.action) LIKE :queryFilter
          OR LOWER(audit.resourceType) LIKE :queryFilter
          OR LOWER(COALESCE(audit.resourceId, '')) LIKE :queryFilter
          OR LOWER(COALESCE(audit.ip, '')) LIKE :queryFilter
          OR LOWER(COALESCE(audit.meta, '')) LIKE :queryFilter
          OR CAST(audit.userId AS varchar(30)) LIKE :queryFilter
        )`,
        { queryFilter },
      );
    }

    if (params.from) {
      qb.andWhere('audit.createdAt >= :from', { from: params.from });
    }

    if (params.to) {
      qb.andWhere('audit.createdAt <= :to', { to: params.to });
    }

    return qb;
  }

  private toCsvCell(value: unknown) {
    const normalized =
      value === null || value === undefined
        ? ''
        : String(value).replace(/\r?\n/g, ' ');
    const escaped = normalized.replace(/"/g, '""');
    return `"${escaped}"`;
  }
}
