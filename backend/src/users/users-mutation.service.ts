import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { User } from './user.entity';
import { UserRole } from './user-role.enum';
import { AreaCode } from '../area-codes/area-code.entity';
import { PermissionFlags } from './permissions';
import { UserStatus } from './user-status.enum';
import { getEnvNumber } from '../common/env.utils';

@Injectable()
export class UsersMutationService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  private userRepository(manager?: EntityManager) {
    return manager ? manager.getRepository(User) : this.userRepo;
  }

  async setAllowedAreas(userId: number, areas: AreaCode[], manager?: EntityManager) {
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
    const blockSec = Math.max(60, getEnvNumber('AUTH_LOGIN_BLOCK_SEC', 900));

    const lastFailedAt = user.lastFailedLoginAt?.getTime() ?? 0;
    const shouldResetCounter =
      !lastFailedAt ||
      now.getTime() - lastFailedAt > resetWindowSec * 1000 ||
      (user.loginBlockedUntil?.getTime() ?? 0) <= now.getTime();

    user.failedLoginAttempts = shouldResetCounter
      ? 1
      : (user.failedLoginAttempts ?? 0) + 1;
    user.lastFailedLoginAt = now;

    if (user.failedLoginAttempts >= blockAfter) {
      user.loginBlockedUntil = new Date(now.getTime() + blockSec * 1000);
    }

    return repo.save(user);
  }

  async clearFailedLoginState(user: User, manager?: EntityManager) {
    const repo = this.userRepository(manager);
    user.failedLoginAttempts = 0;
    user.lastFailedLoginAt = null;
    user.loginBlockedUntil = null;
    return repo.save(user);
  }
}
