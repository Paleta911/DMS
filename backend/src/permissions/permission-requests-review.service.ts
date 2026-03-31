import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  PermissionRequest,
  PermissionRequestStatus,
  PermissionRequestType,
} from './permission-request.entity';
import { PermissionKey, PERMISSION_FIELDS } from '../users/permissions';
import { UsersService } from '../users/users.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { AreaCodesService } from '../area-codes/area-codes.service';
import { UserAdminPolicyService } from '../users/user-admin-policy.service';

@Injectable()
export class PermissionRequestsReviewService {
  constructor(
    @InjectRepository(PermissionRequest)
    private readonly requestRepo: Repository<PermissionRequest>,
    private readonly dataSource: DataSource,
    private readonly usersService: UsersService,
    private readonly auditLogService: AuditLogService,
    private readonly areaCodesService: AreaCodesService,
    private readonly userAdminPolicyService: UserAdminPolicyService,
  ) {}

  async approveRequest(params: { id: number; adminId: number; ip?: string; userAgent?: string }) {
    return this.dataSource.transaction(async (manager) => {
      const requestRepo = manager.getRepository(PermissionRequest);
      const request = await requestRepo.findOne({
        where: { id: params.id },
        relations: ['user'],
      });
      if (!request) {
        throw new NotFoundException('Solicitud no encontrada');
      }
      if (request.status !== PermissionRequestStatus.Pending) {
        throw new BadRequestException('Solicitud ya fue procesada');
      }
      const user = request.user;
      this.userAdminPolicyService.assertTargetIsMutableByAdmin(
        user,
        'No se puede modificar permisos de admins',
      );

      let approvedMeta: Record<string, unknown> = {};

      if (request.requestType === PermissionRequestType.Areas) {
        let requestedAreaCodes: string[] = [];
        try {
          requestedAreaCodes = JSON.parse(request.requestedAreaCodes ?? '[]') as string[];
        } catch {
          requestedAreaCodes = [];
        }
        const allAreas = await this.areaCodesService.findActiveList();
        const requestedAreaSet = new Set(
          requestedAreaCodes.map((code) => code.toUpperCase().trim()).filter(Boolean),
        );
        const areasToAssign = allAreas.filter((area) => requestedAreaSet.has(area.code));
        if (areasToAssign.length === 0) {
          throw new BadRequestException('Solicitud sin áreas válidas');
        }
        const userWithAreas = await this.usersService.findByIdWithAreas(user.id, manager);
        if (!userWithAreas) {
          throw new NotFoundException('Usuario no encontrado');
        }
        const mergedAreas = [...(userWithAreas.allowedAreaCodes ?? [])];
        for (const area of areasToAssign) {
          if (!mergedAreas.some((item) => item.code === area.code)) {
            mergedAreas.push(area);
          }
        }
        await this.usersService.setAllowedAreas(user.id, mergedAreas, manager);
        approvedMeta = {
          requestType: PermissionRequestType.Areas,
          areaCodes: areasToAssign.map((area) => area.code),
        };
      } else {
        let permissions: PermissionKey[] = [];
        try {
          permissions = JSON.parse(request.requestedPermissions) as PermissionKey[];
        } catch {
          permissions = [];
        }
        for (const permission of permissions) {
          const field = PERMISSION_FIELDS[permission];
          if (field) {
            user[field] = true;
          }
        }
        await this.usersService.saveUser(user, manager);
        approvedMeta = { requestType: PermissionRequestType.Permissions, permissions };
      }

      request.status = PermissionRequestStatus.Approved;
      request.reviewedAt = new Date();
      request.reviewedById = params.adminId;
      await requestRepo.save(request);

      await this.auditLogService.log({
        userId: params.adminId,
        action: 'PERMISSION_REQUEST_APPROVED',
        resourceType: 'permission_request',
        resourceId: request.id,
        meta: { userId: user.id, ...approvedMeta },
        ip: params.ip,
        userAgent: params.userAgent,
      }, manager);

      return request;
    });
  }

  async approvePartialAreaRequest(params: {
    id: number;
    adminId: number;
    areaCodes: string[];
    note?: string;
    ip?: string;
    userAgent?: string;
  }) {
    return this.dataSource.transaction(async (manager) => {
      const requestRepo = manager.getRepository(PermissionRequest);
      const request = await requestRepo.findOne({
        where: { id: params.id },
        relations: ['user'],
      });
      if (!request) {
        throw new NotFoundException('Solicitud no encontrada');
      }
      if (request.status !== PermissionRequestStatus.Pending) {
        throw new BadRequestException('Solicitud ya fue procesada');
      }
      if (request.requestType !== PermissionRequestType.Areas) {
        throw new BadRequestException('Aprobación parcial solo aplica para solicitudes de áreas');
      }

      const normalizedToApprove = Array.from(
        new Set(params.areaCodes.map((code) => code.toUpperCase().trim()).filter(Boolean)),
      );
      if (normalizedToApprove.length === 0) {
        throw new BadRequestException('Selecciona al menos un área para aprobar');
      }

      let requestedAreaCodes: string[] = [];
      try {
        requestedAreaCodes = JSON.parse(request.requestedAreaCodes ?? '[]') as string[];
      } catch {
        requestedAreaCodes = [];
      }
      const requestedSet = new Set(
        requestedAreaCodes.map((code) => code.toUpperCase().trim()).filter(Boolean),
      );
      const invalid = normalizedToApprove.filter((code) => !requestedSet.has(code));
      if (invalid.length > 0) {
        throw new BadRequestException(
          `No pertenecen a esta solicitud: ${invalid.join(', ')}`,
        );
      }

      const allAreas = await this.areaCodesService.findActiveList();
      const areaByCode = new Map(allAreas.map((area) => [area.code, area]));
      const areasToAssign = normalizedToApprove
        .map((code) => areaByCode.get(code))
        .filter((area): area is NonNullable<typeof area> => Boolean(area));

      if (areasToAssign.length === 0) {
        throw new BadRequestException('No se encontraron áreas válidas para aprobar');
      }

      const user = request.user;
      this.userAdminPolicyService.assertTargetIsMutableByAdmin(
        user,
        'No se puede modificar permisos de admins',
      );

      const userWithAreas = await this.usersService.findByIdWithAreas(user.id, manager);
      if (!userWithAreas) {
        throw new NotFoundException('Usuario no encontrado');
      }
      const mergedAreas = [...(userWithAreas.allowedAreaCodes ?? [])];
      for (const area of areasToAssign) {
        if (!mergedAreas.some((item) => item.code === area.code)) {
          mergedAreas.push(area);
        }
      }
      await this.usersService.setAllowedAreas(user.id, mergedAreas, manager);

      const remaining = requestedAreaCodes
        .map((code) => code.toUpperCase().trim())
        .filter((code) => !normalizedToApprove.includes(code));

      request.requestedAreaCodes = JSON.stringify(remaining);
      request.reviewedById = params.adminId;
      if (params.note?.trim()) {
        request.reviewReason = params.note.trim();
      }
      if (remaining.length === 0) {
        request.status = PermissionRequestStatus.Approved;
        request.reviewedAt = new Date();
      }
      await requestRepo.save(request);

      await this.auditLogService.log({
        userId: params.adminId,
        action: 'PERMISSION_REQUEST_APPROVED',
        resourceType: 'permission_request',
        resourceId: request.id,
        meta: {
          userId: user.id,
          requestType: PermissionRequestType.Areas,
          partial: true,
          approvedAreaCodes: normalizedToApprove,
          remainingAreaCodes: remaining,
          note: params.note?.trim() || null,
        },
        ip: params.ip,
        userAgent: params.userAgent,
      }, manager);

      return request;
    });
  }

  async rejectRequest(params: { id: number; adminId: number; reason?: string; ip?: string; userAgent?: string }) {
    return this.dataSource.transaction(async (manager) => {
      const requestRepo = manager.getRepository(PermissionRequest);
      const request = await requestRepo.findOne({
        where: { id: params.id },
        relations: ['user'],
      });
      if (!request) {
        throw new NotFoundException('Solicitud no encontrada');
      }
      if (request.status !== PermissionRequestStatus.Pending) {
        throw new BadRequestException('Solicitud ya fue procesada');
      }
      request.status = PermissionRequestStatus.Rejected;
      request.reviewedAt = new Date();
      request.reviewedById = params.adminId;
      request.reviewReason = params.reason ?? null;
      await requestRepo.save(request);

      await this.auditLogService.log({
        userId: params.adminId,
        action: 'PERMISSION_REQUEST_REJECTED',
        resourceType: 'permission_request',
        resourceId: request.id,
        meta: { userId: request.user?.id ?? null, reason: params.reason ?? null },
        ip: params.ip,
        userAgent: params.userAgent,
      }, manager);

      return request;
    });
  }
}
