import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { User } from './user.entity';
import { UserRole } from './user-role.enum';
import { AreaCode } from '../area-codes/area-code.entity';
import { PermissionFlags, PermissionKey } from './permissions';
import { UserStatus } from './user-status.enum';
import { UsersQueryService } from './users-query.service';
import { UsersMutationService } from './users-mutation.service';
import { UserDeletionRegistryService } from './user-deletion-registry.service';
import { UserLifecycleService } from './user-lifecycle.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersQueryService: UsersQueryService,
    private readonly usersMutationService: UsersMutationService,
    private readonly userDeletionRegistryService: UserDeletionRegistryService,
    private readonly userLifecycleService: UserLifecycleService,
  ) {}

  findByEmail(email: string, manager?: EntityManager) {
    return this.usersQueryService.findByEmail(email, manager);
  }

  findByEmailWithPassword(email: string, manager?: EntityManager) {
    return this.usersQueryService.findByEmailWithPassword(email, manager);
  }

  findById(id: number, manager?: EntityManager) {
    return this.usersQueryService.findById(id, manager);
  }

  findByIdWithAreas(id: number, manager?: EntityManager) {
    return this.usersQueryService.findByIdWithAreas(id, manager);
  }

  searchUsers(
    query: string,
    limit?: number,
    recent = false,
    filters?: { status?: string; role?: string; areaState?: string },
  ) {
    // Read operations are delegated to query service to keep this facade thin.
    return this.usersQueryService.searchUsers(query, limit, recent, filters);
  }

  setAllowedAreas(userId: number, areas: AreaCode[], manager?: EntityManager) {
    return this.usersMutationService.setAllowedAreas(userId, areas, manager);
  }

  createUser(params: {
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
  }) {
    return this.usersMutationService.createUser(params);
  }

  hasAnyUsers() {
    return this.usersQueryService.hasAnyUsers();
  }

  hasAdmin() {
    return this.usersQueryService.hasAdmin();
  }

  saveUser(user: User, manager?: EntityManager) {
    return this.usersMutationService.saveUser(user, manager);
  }

  findPermanentlyDeletedByEmail(email: string, manager?: EntityManager) {
    return this.userDeletionRegistryService.findByEmail(email, manager);
  }

  recordFailedLoginAttempt(user: User, manager?: EntityManager) {
    return this.usersMutationService.recordFailedLoginAttempt(user, manager);
  }

  clearFailedLoginState(user: User, manager?: EntityManager) {
    return this.usersMutationService.clearFailedLoginState(user, manager);
  }

  getPendingTasks(userId: number) {
    return this.usersQueryService.getPendingTasks(userId);
  }

  toSafeUser(user: User) {
    return this.usersQueryService.toSafeUser(user);
  }

  ensurePermissions(userId: number, permissions: PermissionKey[]) {
    return this.usersQueryService.ensurePermissions(userId, permissions);
  }

  suspendUser(params: {
    id: number;
    adminId: number;
    ip?: string;
    userAgent?: string;
  }) {
    return this.userLifecycleService.suspendUser(params);
  }

  restoreDeletedUser(params: {
    id: number;
    adminId: number;
    ip?: string;
    userAgent?: string;
  }) {
    return this.userLifecycleService.restoreDeletedUser(params);
  }

  permanentlyDeleteUser(params: {
    id: number;
    adminId: number;
    ip?: string;
    userAgent?: string;
  }) {
    // Destructive lifecycle actions are centralized for auditing and policy checks.
    return this.userLifecycleService.permanentlyDeleteUser(params);
  }
}
