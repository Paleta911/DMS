import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document } from '../documents/document.entity';
import { User } from '../users/user.entity';
import { PermissionRequest } from '../permissions/permission-request.entity';
import { AuditLog } from '../audit-log/audit-log.entity';
import { BackendMetricsService } from '../observability/backend-metrics.service';
import { UserRole } from '../users/user-role.enum';
import { UserStatus } from '../users/user-status.enum';

@Injectable()
export class AdminAnalyticsService {
  constructor(
    @InjectRepository(Document)
    private readonly documentRepo: Repository<Document>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(PermissionRequest)
    private readonly permissionRequestRepo: Repository<PermissionRequest>,
    @InjectRepository(AuditLog)
    private readonly auditLogRepo: Repository<AuditLog>,
    private readonly backendMetricsService: BackendMetricsService,
  ) {}

  async getSummary() {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      documentsTotal,
      documentsLast7d,
      documentsByStatus,
      documentsByArea,
      registrationsByStatus,
      registrationsApprovedLast30d,
      registrationsPendingApproval,
      permissionRequestsByStatus,
      permissionRequestsByType,
      permissionRequestsPending,
      auditEventsLast24h,
      auditAccessDeniedLast24h,
      auditTopActions,
    ] = await Promise.all([
      this.documentRepo.count(),
      this.documentRepo
        .createQueryBuilder('document')
        .where('document.createdAt >= :from', { from: last7d })
        .getCount(),
      this.groupDocumentStatusCounts(),
      this.groupDocumentAreaCounts(),
      this.groupRegistrationStatusCounts(),
      this.userRepo
        .createQueryBuilder('user')
        .where('user.role = :role', { role: UserRole.User })
        .andWhere('user.status = :status', { status: UserStatus.Approved })
        .andWhere('user.approvedAt >= :from', { from: last30d })
        .getCount(),
      this.userRepo
        .createQueryBuilder('user')
        .where('user.role = :role', { role: UserRole.User })
        .andWhere('user.status = :status', {
          status: UserStatus.PendingApproval,
        })
        .getCount(),
      this.groupPermissionRequestStatusCounts(),
      this.groupPermissionRequestTypeCounts(),
      this.permissionRequestRepo
        .createQueryBuilder('request')
        .where('request.status = :status', { status: 'PENDING' })
        .getCount(),
      this.auditLogRepo
        .createQueryBuilder('audit')
        .where('audit.createdAt >= :from', { from: last24h })
        .getCount(),
      this.auditLogRepo
        .createQueryBuilder('audit')
        .where('audit.action = :action', { action: 'ACCESS_DENIED' })
        .andWhere('audit.createdAt >= :from', { from: last24h })
        .getCount(),
      this.groupAuditTopActions(last7d),
    ]);

    return {
      generatedAt: now.toISOString(),
      windows: {
        last24h: last24h.toISOString(),
        last7d: last7d.toISOString(),
        last30d: last30d.toISOString(),
      },
      documents: {
        total: documentsTotal,
        createdLast7d: documentsLast7d,
        byStatus: documentsByStatus,
        topAreas: documentsByArea,
      },
      registrations: {
        byStatus: registrationsByStatus,
        approvedLast30d: registrationsApprovedLast30d,
        pendingApproval: registrationsPendingApproval,
      },
      permissionRequests: {
        totalPending: permissionRequestsPending,
        byStatus: permissionRequestsByStatus,
        byType: permissionRequestsByType,
      },
      audit: {
        totalLast24h: auditEventsLast24h,
        accessDeniedLast24h: auditAccessDeniedLast24h,
        topActionsLast7d: auditTopActions,
      },
      search: this.backendMetricsService.getSnapshot().services.search,
    };
  }

  private async groupDocumentStatusCounts() {
    const rows = await this.documentRepo
      .createQueryBuilder('document')
      .select('document.status', 'label')
      .addSelect('COUNT(1)', 'count')
      .groupBy('document.status')
      .orderBy('COUNT(1)', 'DESC')
      .getRawMany<{ label: string; count: string }>();

    return rows.map((row) => ({
      label: row.label ?? 'SIN_ESTADO',
      count: Number(row.count ?? 0),
    }));
  }

  private async groupDocumentAreaCounts() {
    const rows = await this.documentRepo
      .createQueryBuilder('document')
      .leftJoin('document.areaCode', 'areaCode')
      .select("COALESCE(areaCode.code, 'SIN_AREA')", 'label')
      .addSelect('COUNT(1)', 'count')
      .groupBy('areaCode.code')
      .orderBy('COUNT(1)', 'DESC')
      .limit(5)
      .getRawMany<{ label: string; count: string }>();

    return rows.map((row) => ({
      label: row.label,
      count: Number(row.count ?? 0),
    }));
  }

  private async groupRegistrationStatusCounts() {
    const rows = await this.userRepo
      .createQueryBuilder('user')
      .select('user.status', 'label')
      .addSelect('COUNT(1)', 'count')
      .where('user.role = :role', { role: UserRole.User })
      .groupBy('user.status')
      .orderBy('COUNT(1)', 'DESC')
      .getRawMany<{ label: string; count: string }>();

    return rows.map((row) => ({
      label: row.label ?? 'SIN_ESTADO',
      count: Number(row.count ?? 0),
    }));
  }

  private async groupPermissionRequestStatusCounts() {
    const rows = await this.permissionRequestRepo
      .createQueryBuilder('request')
      .select('request.status', 'label')
      .addSelect('COUNT(1)', 'count')
      .groupBy('request.status')
      .orderBy('COUNT(1)', 'DESC')
      .getRawMany<{ label: string; count: string }>();

    return rows.map((row) => ({
      label: row.label ?? 'SIN_ESTADO',
      count: Number(row.count ?? 0),
    }));
  }

  private async groupPermissionRequestTypeCounts() {
    const rows = await this.permissionRequestRepo
      .createQueryBuilder('request')
      .select('request.requestType', 'label')
      .addSelect('COUNT(1)', 'count')
      .groupBy('request.requestType')
      .orderBy('COUNT(1)', 'DESC')
      .getRawMany<{ label: string; count: string }>();

    return rows.map((row) => ({
      label: row.label ?? 'SIN_TIPO',
      count: Number(row.count ?? 0),
    }));
  }

  private async groupAuditTopActions(from: Date) {
    const rows = await this.auditLogRepo
      .createQueryBuilder('audit')
      .select('audit.action', 'label')
      .addSelect('COUNT(1)', 'count')
      .where('audit.createdAt >= :from', { from })
      .groupBy('audit.action')
      .orderBy('COUNT(1)', 'DESC')
      .limit(5)
      .getRawMany<{ label: string; count: string }>();

    return rows.map((row) => ({
      label: row.label ?? 'SIN_ACCION',
      count: Number(row.count ?? 0),
    }));
  }
}
