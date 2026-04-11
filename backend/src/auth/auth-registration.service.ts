import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { UserRole } from '../users/user-role.enum';
import { CreateUserDto } from './dto/create-user.dto';
import { AuditLogService } from '../audit-log/audit-log.service';
import { RegisterDto } from './dto/register.dto';
import { VerificationService } from './verification.service';
import { getEnv } from '../common/env.utils';
import { UserStatus } from '../users/user-status.enum';
import { FULL_PERMISSIONS } from '../users/permissions';
import { UserAdminPolicyService } from '../users/user-admin-policy.service';
import { AreaCodesService } from '../area-codes/area-codes.service';
import {
  assertBirthDateRange,
  normalizePersonName,
  normalizeRequestedAreaNombre,
} from '../users/user-profile.rules';

@Injectable()
export class AuthRegistrationService {
  constructor(
    private readonly usersService: UsersService,
    private readonly auditLogService: AuditLogService,
    private readonly verificationService: VerificationService,
    private readonly userAdminPolicyService: UserAdminPolicyService,
    private readonly areaCodesService: AreaCodesService,
  ) {}

  async register(
    dto: RegisterDto,
    meta?: { actorId?: number; ip?: string; userAgent?: string },
  ) {
    const actor = meta?.actorId
      ? await this.usersService.findById(meta.actorId)
      : null;
    const isAdmin = actor?.role === UserRole.Admin;
    const permanentlyDeletedRecord =
      await this.findPermanentlyDeletedRecordByEmail(dto.email);
    if (permanentlyDeletedRecord) {
      throw new BadRequestException({
        message: 'Este correo fue eliminado por el administrador',
        code: 'AUTH_ACCOUNT_REMOVED',
      });
    }
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new BadRequestException('Este correo ya está vinculado a una cuenta');
    }

    const nombre = normalizePersonName(dto.nombre);
    const primerApellido = normalizePersonName(dto.primerApellido);
    const segundoApellido = normalizePersonName(dto.segundoApellido);

    if (!isAdmin) {
      if (!nombre || nombre.length < 2) {
        throw new BadRequestException('Nombre requerido');
      }
      if (!primerApellido || primerApellido.length < 2) {
        throw new BadRequestException('Primer apellido requerido');
      }
      const requestedAreaNombre = normalizeRequestedAreaNombre(
        dto.requestedAreaNombre,
      );
      if (!dto.areaCode?.trim() && !requestedAreaNombre) {
        throw new BadRequestException('Área requerida');
      }
      if (dto.requestedAreaNombre !== undefined && !requestedAreaNombre) {
        throw new BadRequestException('Escribe tu área');
      }
      if (!dto.confirmPassword || dto.password !== dto.confirmPassword) {
        throw new BadRequestException('Las contraseñas no coinciden');
      }
      const allowedDomain = (getEnv('ALLOWED_EMAIL_DOMAIN', 'bsm.com.mx') ?? '')
        .toLowerCase()
        .trim();
      const emailDomain = dto.email.split('@')[1]?.toLowerCase() ?? '';
      if (!allowedDomain || emailDomain !== allowedDomain) {
        throw new BadRequestException('Correo inválido');
      }
    }

    assertBirthDateRange(dto.fechaNacimiento);
    const requestedAreaNombre = normalizeRequestedAreaNombre(
      dto.requestedAreaNombre,
    );
    const selectedArea = requestedAreaNombre
      ? null
      : await this.resolveSelectedArea(dto.areaCode, isAdmin);

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const role =
      isAdmin && dto.role === UserRole.Admin ? UserRole.Admin : UserRole.User;

    if (isAdmin && dto.role === UserRole.Admin) {
      this.userAdminPolicyService.assertCanCreateAdmin(actor);
    }

    const permissions = isAdmin ? FULL_PERMISSIONS : undefined;
    const status = isAdmin
      ? UserStatus.Approved
      : UserStatus.PendingVerification;
    const approvedAt = isAdmin ? new Date() : null;

    const user = await this.usersService.createUser({
      email: dto.email,
      passwordHash,
      role,
      nombre,
      primerApellido,
      segundoApellido,
      telefono: dto.telefono ?? null,
      fechaNacimiento: dto.fechaNacimiento
        ? new Date(dto.fechaNacimiento)
        : null,
      status,
      verifiedAt: isAdmin ? new Date() : null,
      approvedAt,
      approvedById: isAdmin ? actor?.id ?? null : null,
      requestedAreaNombre: !isAdmin ? requestedAreaNombre : null,
      permissions,
    });

    if (selectedArea) {
      await this.usersService.setAllowedAreas(user.id, [selectedArea]);
    }

    await this.auditLogService.log({
      userId: actor?.id ?? user.id,
      action: 'REGISTER',
      resourceType: 'auth',
      resourceId: user.id,
      meta: {
        email: user.email,
        status: user.status,
        role: user.role,
        areaCode: selectedArea?.code ?? null,
        requestedAreaNombre: requestedAreaNombre ?? null,
      },
      ip: meta?.ip,
      userAgent: meta?.userAgent,
    });

    if (!isAdmin) {
      const code = this.verificationService.generateCode();
      await this.verificationService.createOrRefresh(user, code);
      const result = await this.verificationService.sendCode(user, code);
      await this.auditLogService.log({
        userId: user.id,
        action: result.status === 'FAILED' ? 'EMAIL_FAILED' : 'EMAIL_SENT',
        resourceType: 'auth',
        resourceId: user.id,
        meta: { email: user.email, status: result.status },
        ip: meta?.ip,
        userAgent: meta?.userAgent,
      });
    }

    return this.usersService.toSafeUser(user);
  }

  private async resolveSelectedArea(areaCode: string | undefined, isAdmin: boolean) {
    const normalizedAreaCode = areaCode?.trim().toUpperCase() ?? '';
    if (!normalizedAreaCode) {
      return null;
    }

    const activeAreas = await this.areaCodesService.findActiveList();
    const selectedArea = activeAreas.find((area) => area.code === normalizedAreaCode) ?? null;

    if (!selectedArea && !isAdmin) {
      throw new BadRequestException('Área inválida');
    }

    return selectedArea;
  }

  async bootstrapAdmin(dto: CreateUserDto) {
    const hasAdmin = await this.usersService.hasAdmin();
    const permanentlyDeletedRecord =
      await this.findPermanentlyDeletedRecordByEmail(dto.email);
    if (permanentlyDeletedRecord) {
      throw new BadRequestException('Este correo fue eliminado por el administrador');
    }
    const existing = await this.usersService.findByEmailWithPassword(dto.email);
    if (hasAdmin) {
      if (!existing || existing.role !== UserRole.Admin || !existing.isSuperAdmin) {
        throw new ConflictException('Ya existe un admin');
      }

      existing.passwordHash = await bcrypt.hash(dto.password, 10);
      existing.status = UserStatus.Approved;
      existing.verifiedAt = existing.verifiedAt ?? new Date();
      existing.approvedAt = existing.approvedAt ?? new Date();
      existing.approvedById = existing.approvedById ?? null;
      existing.rejectedAt = null;
      existing.rejectedReason = null;
      existing.isSuperAdmin = true;
      existing.canAccess = FULL_PERMISSIONS.canAccess;
      existing.canRead = FULL_PERMISSIONS.canRead;
      existing.canUpload = FULL_PERMISSIONS.canUpload;
      existing.canUploadNewVersion = FULL_PERMISSIONS.canUploadNewVersion;
      existing.canReview = FULL_PERMISSIONS.canReview;
      existing.canApprove = FULL_PERMISSIONS.canApprove;
      existing.canDelete = FULL_PERMISSIONS.canDelete;
      existing.failedLoginAttempts = 0;
      existing.lastFailedLoginAt = null;
      existing.loginBlockedUntil = null;
      const saved = await this.usersService.saveUser(existing);
      return this.usersService.toSafeUser(saved);
    }

    if (existing) {
      throw new BadRequestException('Este correo ya está vinculado a una cuenta');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.usersService.createUser({
      email: dto.email,
      passwordHash,
      role: UserRole.Admin,
      status: UserStatus.Approved,
      approvedAt: new Date(),
      isSuperAdmin: true,
      permissions: FULL_PERMISSIONS,
    });
    return this.usersService.toSafeUser(user);
  }

  private async findPermanentlyDeletedRecordByEmail(email: string) {
    const lookup = (
      this.usersService as UsersService & {
        findPermanentlyDeletedByEmail?: (value: string) => Promise<unknown>;
      }
    ).findPermanentlyDeletedByEmail;
    if (typeof lookup !== 'function') {
      return null;
    }
    return lookup.call(this.usersService, email);
  }
}
