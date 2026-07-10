import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

// Creation service validates self-service permission/area requests and avoids duplicate pending requests.
@Injectable()
export class PermissionRequestsCreateService {
  constructor(
    @InjectRepository(PermissionRequest)
    private readonly requestRepo: Repository<PermissionRequest>,
    private readonly usersService: UsersService,
    private readonly auditLogService: AuditLogService,
    private readonly areaCodesService: AreaCodesService,
    private readonly userAdminPolicyService: UserAdminPolicyService,
  ) {}

  async createRequest(params: {
    userId: number;
    permissions: PermissionKey[];
    comment?: string;
    ip?: string;
    userAgent?: string;
  }) {
    // Only regular users can create self-service requests.
    const user = await this.usersService.findById(params.userId);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    this.userAdminPolicyService.assertCanCreateSelfServiceRequest(
      user,
      'permisos',
    );

    // Normalize and deduplicate requested permissions before validation.
    const requestedPermissions = Array.from(
      new Set(
        params.permissions
          .map((permission) => permission?.trim())
          .filter(Boolean),
      ),
    ) as PermissionKey[];
    if (requestedPermissions.length === 0) {
      throw new BadRequestException('Selecciona al menos un permiso');
    }
    const alreadyGranted = requestedPermissions.filter((permission) => {
      const field = PERMISSION_FIELDS[permission];
      return field ? Boolean(user[field]) : false;
    });
    if (alreadyGranted.length > 0) {
      throw new BadRequestException(
        `Ya tienes activos: ${alreadyGranted.join(', ')}`,
      );
    }

    // Prevent creating duplicate pending requests for the same permissions.
    const pendingRequests = await this.requestRepo
      .createQueryBuilder('request')
      .select('request.requestedPermissions', 'requestedPermissions')
      .where('request.userId = :userId', { userId: user.id })
      .andWhere('request.status = :status', {
        status: PermissionRequestStatus.Pending,
      })
      .andWhere('request.requestType = :requestType', {
        requestType: PermissionRequestType.Permissions,
      })
      .orderBy('request.id', 'DESC')
      .take(100)
      .getRawMany<{ requestedPermissions: string }>();
    const pendingPermissions = new Set<PermissionKey>();
    for (const pending of pendingRequests) {
      try {
        const parsed = JSON.parse(
          pending.requestedPermissions ?? '[]',
        ) as PermissionKey[];
        parsed.forEach((permission) => pendingPermissions.add(permission));
      } catch {
        continue;
      }
    }
    const duplicated = requestedPermissions.filter((permission) =>
      pendingPermissions.has(permission),
    );
    if (duplicated.length > 0) {
      throw new BadRequestException(
        `Ya tienes solicitudes pendientes para: ${duplicated.join(', ')}`,
      );
    }

    const record = this.requestRepo.create({
      user,
      requestedPermissions: JSON.stringify(requestedPermissions),
      requestedAreaCodes: null,
      comment: params.comment ?? null,
      requestType: PermissionRequestType.Permissions,
      status: PermissionRequestStatus.Pending,
    });
    const saved = await this.requestRepo.save(record);

    await this.auditLogService.log({
      userId: user.id,
      action: 'PERMISSION_REQUEST_CREATED',
      resourceType: 'permission_request',
      resourceId: saved.id,
      meta: { permissions: requestedPermissions },
      ip: params.ip,
      userAgent: params.userAgent,
    });

    return saved;
  }

  async createAreaRequest(params: {
    userId: number;
    areaCodes: string[];
    comment?: string;
    ip?: string;
    userAgent?: string;
  }) {
    const user = await this.usersService.findById(params.userId);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    this.userAdminPolicyService.assertCanCreateSelfServiceRequest(
      user,
      'áreas',
    );

    // Normalize/unique area codes to simplify validation and comparisons.
    const normalizedAreaCodes = Array.from(
      new Set(
        params.areaCodes
          .map((code) => code.toUpperCase().trim())
          .filter(Boolean),
      ),
    );
    if (normalizedAreaCodes.length === 0) {
      throw new BadRequestException('Selecciona al menos un área');
    }

    const allAreas = await this.areaCodesService.findActiveList();
    const validCodes = new Set(allAreas.map((area) => area.code));
    const invalidCodes = normalizedAreaCodes.filter(
      (code) => !validCodes.has(code),
    );
    if (invalidCodes.length > 0) {
      throw new BadRequestException(
        `Áreas inválidas: ${invalidCodes.join(', ')}`,
      );
    }
    const userWithAreas = await this.usersService.findByIdWithAreas(user.id);
    const assignedCodes = new Set(
      (userWithAreas?.allowedAreaCodes ?? []).map((area) =>
        area.code.toUpperCase().trim(),
      ),
    );
    const alreadyAssigned = normalizedAreaCodes.filter((code) =>
      assignedCodes.has(code),
    );
    if (alreadyAssigned.length > 0) {
      throw new BadRequestException(
        `Ya tienes áreas asignadas: ${alreadyAssigned.join(', ')}`,
      );
    }

    // Avoid duplicate pending area requests for the same user.
    const pendingAreaRequests = await this.requestRepo
      .createQueryBuilder('request')
      .select('request.requestedAreaCodes', 'requestedAreaCodes')
      .where('request.userId = :userId', { userId: user.id })
      .andWhere('request.status = :status', {
        status: PermissionRequestStatus.Pending,
      })
      .andWhere('request.requestType = :requestType', {
        requestType: PermissionRequestType.Areas,
      })
      .orderBy('request.id', 'DESC')
      .take(100)
      .getRawMany<{ requestedAreaCodes: string | null }>();
    const pendingAreaCodes = new Set<string>();
    for (const pending of pendingAreaRequests) {
      try {
        const parsed = JSON.parse(
          pending.requestedAreaCodes ?? '[]',
        ) as string[];
        parsed.forEach((code) =>
          pendingAreaCodes.add(code.toUpperCase().trim()),
        );
      } catch {
        continue;
      }
    }
    const duplicatedAreaCodes = normalizedAreaCodes.filter((code) =>
      pendingAreaCodes.has(code),
    );
    if (duplicatedAreaCodes.length > 0) {
      throw new BadRequestException(
        `Ya tienes solicitudes pendientes para áreas: ${duplicatedAreaCodes.join(', ')}`,
      );
    }

    const record = this.requestRepo.create({
      user,
      requestedPermissions: JSON.stringify([]),
      requestedAreaCodes: JSON.stringify(normalizedAreaCodes),
      comment: params.comment ?? null,
      requestType: PermissionRequestType.Areas,
      status: PermissionRequestStatus.Pending,
    });
    const saved = await this.requestRepo.save(record);

    await this.auditLogService.log({
      userId: user.id,
      action: 'PERMISSION_REQUEST_CREATED',
      resourceType: 'permission_request',
      resourceId: saved.id,
      meta: {
        requestType: PermissionRequestType.Areas,
        areaCodes: normalizedAreaCodes,
      },
      ip: params.ip,
      userAgent: params.userAgent,
    });

    return saved;
  }
}
