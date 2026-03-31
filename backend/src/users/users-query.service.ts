import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { User } from './user.entity';
import { UserRole } from './user-role.enum';
import { UserStatus } from './user-status.enum';
import { PermissionKey } from './permissions';
import { DocumentApproval, ApprovalDecision, ApprovalStep } from '../documents/document-approval.entity';
import { assertPermissions } from './user-access.policy';

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
      relations: ['allowedAreaCodes'],
    });
  }

  async searchUsers(query: string, limit = 10) {
    const term = query.trim();
    if (!term) {
      return [];
    }

    const like = `%${term}%`;
    const users = await this.userRepo
      .createQueryBuilder('user')
      .select([
        'user.id',
        'user.email',
        'user.nombre',
        'user.primerApellido',
        'user.segundoApellido',
        'user.role',
        'user.status',
        'user.canAccess',
        'user.canReview',
        'user.canApprove',
      ])
      .where('user.email LIKE :like', { like })
      .orWhere('user.nombre LIKE :like', { like })
      .orWhere('user.primerApellido LIKE :like', { like })
      .orWhere('user.segundoApellido LIKE :like', { like })
      .orderBy('user.email', 'ASC')
      .take(limit)
      .getMany();

    return users.map((user) => ({
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
