import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { User } from './user.entity';
import { UserRole } from './user-role.enum';
import { AreaCode } from '../area-codes/area-code.entity';
import { PermissionFlags } from './permissions';
import { UserStatus } from './user-status.enum';
import { getEnvNumber } from '../common/env.utils';

// User mutation service: create, update, and area assignment with transaction-aware EntityManager support
// Encapsulates user creation with role/status/permission defaults; manages area code relationships
@Injectable()
export class UsersMutationService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  private userRepository(manager?: EntityManager) {
    return manager ? manager.getRepository(User) : this.userRepo;
  }

  // Set user's allowed area codes (admin-assigned operational areas with permissions)
  async setAllowedAreas(
    userId: number,
    areas: AreaCode[],
    manager?: EntityManager,
  ) {
    const repo = this.userRepository(manager);
    const user = await repo.findOne({
      where: { id: userId },
      relations: ['allowedAreaCodes'],
    });
    if (!user) {
      return null;
    }
    user.allowedAreaCodes = areas;
    return repo.save(user);
  }

  async createUser(params: {
    email: string;
    passwordHash: string;
    role: UserRole;
    nombre?: string | null;
    primerApellido?: string | null;
    segundoApellido?: string | null;
    telefono?: string | null;
    fechaNacimiento?: Date | null;
    status?: UserStatus;
    verifiedAt?: Date | null;
    approvedAt?: Date | null;
    approvedById?: number | null;
    rejectedAt?: Date | null;
    rejectedReason?: string | null;
    requestedAreaNombre?: string | null;
    isSuperAdmin?: boolean;
    permissions?: PermissionFlags;
    failedLoginAttempts?: number;
    lastFailedLoginAt?: Date | null;
    loginBlockedUntil?: Date | null;
  }) {
    const repo = this.userRepository();
    const user = repo.create({
      email: params.email,
      passwordHash: params.passwordHash,
      role: params.role,
      nombre: params.nombre ?? null,
      primerApellido: params.primerApellido ?? null,
      segundoApellido: params.segundoApellido ?? null,
      telefono: params.telefono ?? null,
      fechaNacimiento: params.fechaNacimiento ?? null,
      status: params.status ?? UserStatus.PendingVerification,
      verifiedAt: params.verifiedAt ?? null,
      approvedAt: params.approvedAt ?? null,
      approvedById: params.approvedById ?? null,
      rejectedAt: params.rejectedAt ?? null,
      rejectedReason: params.rejectedReason ?? null,
      requestedAreaNombre: params.requestedAreaNombre ?? null,
      isSuperAdmin: params.isSuperAdmin ?? false,
      ...(params.permissions ?? {}),
      failedLoginAttempts: params.failedLoginAttempts ?? 0,
      lastFailedLoginAt: params.lastFailedLoginAt ?? null,
      loginBlockedUntil: params.loginBlockedUntil ?? null,
    });
    return repo.save(user);
  }

  async saveUser(user: User, manager?: EntityManager) {
    return this.userRepository(manager).save(user);
  }

  async recordFailedLoginAttempt(user: User, manager?: EntityManager) {
    const repo = this.userRepository(manager);
    const now = new Date();
    const resetWindowSec = Math.max(
      60,
      getEnvNumber('AUTH_LOGIN_RESET_WINDOW_SEC', 3600),
    );
    const blockAfter = Math.max(3, getEnvNumber('AUTH_LOGIN_BLOCK_AFTER', 5));
    const blockSec = Math.max(60, getEnvNumber('AUTH_LOGIN_BLOCK_SEC', 300));

    const lastFailedAt = user.lastFailedLoginAt?.getTime() ?? 0;
    const blockedUntilMs = user.loginBlockedUntil?.getTime() ?? null;
    const shouldResetCounter =
      !lastFailedAt ||
      now.getTime() - lastFailedAt > resetWindowSec * 1000 ||
      (blockedUntilMs !== null && blockedUntilMs <= now.getTime());

    const failedLoginAttempts = shouldResetCounter
      ? 1
      : (user.failedLoginAttempts ?? 0) + 1;
    const loginBlockedUntil =
      failedLoginAttempts >= blockAfter
        ? new Date(now.getTime() + blockSec * 1000)
        : null;

    user.failedLoginAttempts = failedLoginAttempts;
    user.lastFailedLoginAt = now;
    user.loginBlockedUntil = loginBlockedUntil;

    await repo.update(user.id, {
      failedLoginAttempts: user.failedLoginAttempts,
      lastFailedLoginAt: user.lastFailedLoginAt,
      loginBlockedUntil,
    });
    return user;
  }

  async clearFailedLoginState(user: User, manager?: EntityManager) {
    const repo = this.userRepository(manager);
    user.failedLoginAttempts = 0;
    user.lastFailedLoginAt = null;
    user.loginBlockedUntil = null;
    await repo.update(user.id, {
      failedLoginAttempts: 0,
      lastFailedLoginAt: null,
      loginBlockedUntil: null,
    });
    return user;
  }
}
