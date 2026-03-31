import { ForbiddenException, Injectable } from '@nestjs/common';
import { AuditLogService } from '../audit-log/audit-log.service';
import { UsersService } from './users.service';
import { UserRole } from './user-role.enum';

export type AccessActor = {
  id: number;
  role: UserRole;
};

type AuditDeniedParams = {
  actor: AccessActor;
  resourceType: string;
  resourceId?: string | number | null;
  endpoint: string;
  ip?: string;
  userAgent?: string;
  meta?: Record<string, unknown>;
};

type AssertAreaAccessParams = AuditDeniedParams & {
  areaCode?: string | null;
  requireAreaCode?: boolean;
  requiredMessage?: string;
  deniedMessage?: string;
};

@Injectable()
export class UserScopeService {
  constructor(
    private readonly usersService: UsersService,
    private readonly auditLogService: AuditLogService,
  ) {}

  isAdmin(actor?: Pick<AccessActor, 'role'> | null) {
    return actor?.role === UserRole.Admin;
  }

  async getAllowedAreaCodes(actor: AccessActor | undefined | null) {
    if (!actor?.id || this.isAdmin(actor)) {
      return null;
    }
    const user = await this.usersService.findByIdWithAreas(actor.id);
    return user?.allowedAreaCodes?.map((area) => area.code) ?? [];
  }

  async auditAccessDenied(params: AuditDeniedParams) {
    await this.auditLogService.log({
      userId: params.actor.id,
      action: 'ACCESS_DENIED',
      resourceType: params.resourceType,
      resourceId: params.resourceId ?? null,
      meta: {
        endpoint: params.endpoint,
        ...(params.meta ?? {}),
      },
      ip: params.ip,
      userAgent: params.userAgent,
    });
  }

  async runWithAccessDeniedAudit<T>(
    params: AuditDeniedParams,
    operation: () => Promise<T>,
  ) {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof ForbiddenException) {
        await this.auditAccessDenied(params);
      }
      throw error;
    }
  }

  async assertAreaAccess(params: AssertAreaAccessParams) {
    if (this.isAdmin(params.actor)) {
      return null;
    }

    const normalizedAreaCode = params.areaCode?.trim().toUpperCase() ?? null;
    if (!normalizedAreaCode) {
      if (!params.requireAreaCode) {
        return [];
      }
      await this.auditAccessDenied({
        actor: params.actor,
        resourceType: params.resourceType,
        resourceId: params.resourceId,
        endpoint: params.endpoint,
        ip: params.ip,
        userAgent: params.userAgent,
        meta: {
          reason: 'areaCode required',
          ...(params.meta ?? {}),
        },
      });
      throw new ForbiddenException(
        params.requiredMessage ?? 'areaCode requerido para usuarios',
      );
    }

    const allowedAreaCodes = await this.getAllowedAreaCodes(params.actor);
    if (!allowedAreaCodes?.includes(normalizedAreaCode)) {
      await this.auditAccessDenied({
        actor: params.actor,
        resourceType: params.resourceType,
        resourceId: params.resourceId,
        endpoint: params.endpoint,
        ip: params.ip,
        userAgent: params.userAgent,
        meta: {
          areaCode: normalizedAreaCode,
          ...(params.meta ?? {}),
        },
      });
      throw new ForbiddenException(
        params.deniedMessage ?? 'Area no permitida',
      );
    }

    return allowedAreaCodes;
  }
}
