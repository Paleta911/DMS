import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, EntityManager, In, Repository } from 'typeorm';
import { User } from './user.entity';
import { UserRole } from './user-role.enum';
import { UserStatus } from './user-status.enum';
import { PermissionKey } from './permissions';
import {
  DocumentApproval,
  ApprovalDecision,
  ApprovalStep,
} from '../documents/document-approval.entity';
import { assertPermissions } from './user-access.policy';

// User query service: fetch users by email/ID, with optional relation eager-loading; find approvers by permission
// Supports transaction-aware queries via EntityManager; queries across multiple entities for document approval context
@Injectable()
export class UsersQueryService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(DocumentApproval)
    private readonly approvalRepo: Repository<DocumentApproval>,
  ) {}

  private userRepository(manager?: EntityManager) {
    return manager ? manager.getRepository(User) : this.userRepo;
  }

  // Find user by email; used for login/registration lookups
  async findByEmail(email: string, manager?: EntityManager) {
    return this.userRepository(manager).findOne({ where: { email } });
  }

  async findByEmailWithPassword(email: string, manager?: EntityManager) {
    return this.userRepository(manager)
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email })
      .getOne();
  }

  async findById(id: number, manager?: EntityManager) {
    return this.userRepository(manager).findOne({ where: { id } });
  }

  async findByIdWithAreas(id: number, manager?: EntityManager) {
    return this.userRepository(manager).findOne({
      where: { id },
      relations: ['allowedAreaCodes', 'emailVerification'],
    });
  }

  async searchUsers(
    query: string,
    limit?: number,
    recent = false,
    filters?: { status?: string; role?: string; areaState?: string },
  ) {
    const term = query.trim();
    const statusFilter = filters?.status?.trim() ?? '';
    const roleFilter = filters?.role?.trim() ?? '';
    const areaStateFilter = filters?.areaState?.trim() ?? '';
    const hasStructuredFilters = Boolean(
      statusFilter || roleFilter || areaStateFilter,
    );

    if (!term && !recent && !hasStructuredFilters) {
      return [];
    }

    const qb = this.userRepo
      .createQueryBuilder('user')
      .select([
        'user.id',
        'user.email',
        'user.createdAt',
        'user.nombre',
        'user.primerApellido',
        'user.segundoApellido',
        'user.role',
        'user.status',
        'user.canAccess',
        'user.canReview',
        'user.canApprove',
      ]);

    if (areaStateFilter) {
      qb.leftJoin('user.allowedAreaCodes', 'areaCode').distinct(true);
    }

    if (limit !== undefined) {
      qb.take(limit);
    }

    if (term) {
      const like = `%${term.toLowerCase()}%`;
      qb.where(
        new Brackets((searchQb) => {
          searchQb
            .where('LOWER(user.email) LIKE :like', { like })
            .orWhere("LOWER(COALESCE(user.nombre, '')) LIKE :like", { like })
            .orWhere("LOWER(COALESCE(user.primerApellido, '')) LIKE :like", {
              like,
            })
            .orWhere("LOWER(COALESCE(user.segundoApellido, '')) LIKE :like", {
              like,
            });
        }),
      ).orderBy('user.email', 'ASC');
    } else {
      qb.orderBy('user.createdAt', 'DESC');
    }

    if (statusFilter) {
      qb.andWhere('user.status = :statusFilter', { statusFilter });
    } else {
      qb.andWhere('user.status <> :deletedStatus', {
        deletedStatus: UserStatus.Deleted,
      });
    }

    if (roleFilter) {
      qb.andWhere('user.role = :roleFilter', { roleFilter });
    }

    if (areaStateFilter === 'with_area') {
      qb.andWhere('areaCode.id IS NOT NULL');
    } else if (areaStateFilter === 'without_area') {
      qb.andWhere('areaCode.id IS NULL');
      qb.andWhere(
        "(user.requestedAreaNombre IS NULL OR LTRIM(RTRIM(user.requestedAreaNombre)) = '')",
      );
    } else if (areaStateFilter === 'manual_area') {
      qb.andWhere('areaCode.id IS NULL');
      qb.andWhere(
        "(user.requestedAreaNombre IS NOT NULL AND LTRIM(RTRIM(user.requestedAreaNombre)) <> '')",
      );
    }

    const users = await qb.getMany();
    const usersWithAreas =
      users.length > 0
        ? await this.userRepo.find({
            where: { id: In(users.map((user) => user.id)) },
            relations: ['allowedAreaCodes'],
          })
        : [];
    const areaDataByUserId = new Map(
      usersWithAreas.map((user) => [
        user.id,
        {
          requestedAreaNombre: user.requestedAreaNombre ?? null,
          allowedAreaCodes: (user.allowedAreaCodes ?? []).map((area) => ({
            code: area.code,
            nombre: area.nombre,
          })),
        },
      ]),
    );

    return users.map((user) => ({
      ...(areaDataByUserId.get(user.id) ?? {
        requestedAreaNombre: null,
        allowedAreaCodes: [],
      }),
      id: user.id,
      email: user.email,
      nombre: user.nombre ?? null,
      primerApellido: user.primerApellido ?? null,
      segundoApellido: user.segundoApellido ?? null,
      role: user.role,
      status: user.status,
      canAccess: user.canAccess,
      canReview: user.canReview,
      canApprove: user.canApprove,
    }));
  }

  async hasAnyUsers() {
    return (await this.userRepo.count()) > 0;
  }

  async hasAdmin() {
    return (await this.userRepo.count({ where: { role: UserRole.Admin } })) > 0;
  }

  async getPendingTasks(userId: number) {
    const pendingReview = await this.approvalRepo.count({
      where: {
        user: { id: userId },
        step: ApprovalStep.Reviso,
        decision: ApprovalDecision.Pending,
      },
    });
    const pendingApprove = await this.approvalRepo.count({
      where: {
        user: { id: userId },
        step: ApprovalStep.Aprobo,
        decision: ApprovalDecision.Pending,
      },
    });
    return { pendingReview, pendingApprove };
  }

  async ensurePermissions(userId: number, permissions: PermissionKey[]) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    assertPermissions(user, permissions);
    return user;
  }

  toSafeUser(user: User) {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      status: user.status,
      nombre: user.nombre ?? null,
      primerApellido: user.primerApellido ?? null,
      segundoApellido: user.segundoApellido ?? null,
      telefono: user.telefono ?? null,
      fechaNacimiento: user.fechaNacimiento ?? null,
      verifiedAt: user.verifiedAt ?? null,
      approvedAt: user.approvedAt ?? null,
      approvedById: user.approvedById ?? null,
      rejectedAt: user.rejectedAt ?? null,
      rejectedReason: user.rejectedReason ?? null,
      requestedAreaNombre: user.requestedAreaNombre ?? null,
      deletedAt: user.deletedAt ?? null,
      deletedById: user.deletedById ?? null,
      sendStatus: user.emailVerification?.sendStatus ?? null,
      sendAttempts: user.emailVerification?.sendAttempts ?? 0,
      lastSentAt: user.emailVerification?.sentAt ?? null,
      lastError: user.emailVerification?.lastError ?? null,
      verifyAttempts: user.emailVerification?.verifyAttempts ?? 0,
      lastAttemptAt: user.emailVerification?.lastAttemptAt ?? null,
      isSuperAdmin: user.isSuperAdmin ?? false,
      permissions: {
        canAccess: user.canAccess,
        canRead: user.canRead,
        canUpload: user.canUpload,
        canUploadNewVersion: user.canUploadNewVersion,
        canReview: user.canReview,
        canApprove: user.canApprove,
        canDelete: user.canDelete,
      },
    };
  }
}
