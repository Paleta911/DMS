import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { User } from './user.entity';
import { UserStatus } from './user-status.enum';
import {
  DEFAULT_APPROVED_PERMISSIONS,
  type PermissionFlags,
} from './permissions';
import {
  ApprovalDecision,
  ApprovalStep,
  DocumentApproval,
} from '../documents/document-approval.entity';
import { PermissionRequest } from '../permissions/permission-request.entity';
import { AuditLogService } from '../audit-log/audit-log.service';
import { UserAdminPolicyService } from './user-admin-policy.service';
import { UserDeletionRegistryService } from './user-deletion-registry.service';
import { Document } from '../documents/document.entity';
import { Version } from '../versions/version.entity';

type UserLifecycleParams = {
  id: number;
  adminId: number;
  ip?: string;
  userAgent?: string;
};

const ZERO_PERMISSIONS: PermissionFlags = {
  canAccess: false,
  canRead: false,
  canUpload: false,
  canUploadNewVersion: false,
  canReview: false,
  canApprove: false,
  canDelete: false,
};

@Injectable()
export class UserLifecycleService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly auditLogService: AuditLogService,
    private readonly userAdminPolicyService: UserAdminPolicyService,
    private readonly userDeletionRegistryService: UserDeletionRegistryService,
  ) {}

  async suspendUser(params: UserLifecycleParams) {
    return this.dataSource.transaction(async (manager) => {
      const userRepo = manager.getRepository(User);
      const user = await userRepo.findOne({ where: { id: params.id } });
      if (!user) {
        throw new NotFoundException('Usuario no encontrado');
      }

      this.userAdminPolicyService.assertTargetIsMutableByAdmin(
        user,
        'No se puede eliminar admins',
      );

      if (user.status === UserStatus.Deleted) {
        throw new BadRequestException('Usuario ya está eliminado');
      }

      if (user.status !== UserStatus.Approved) {
        throw new BadRequestException(
          'Solo se pueden eliminar usuarios aprobados',
        );
      }

      const clearedAssignments = await this.clearPendingWorkflowAssignments(
        user.id,
        manager,
      );

      user.status = UserStatus.Deleted;
      user.deletedAt = new Date();
      user.deletedById = params.adminId;
      this.applyPermissions(user, ZERO_PERMISSIONS);
      this.clearLoginState(user);
      await userRepo.save(user);

      await this.auditLogService.log(
        {
          userId: params.adminId,
          action: 'USER_SUSPENDED',
          resourceType: 'user',
          resourceId: user.id,
          meta: {
            email: user.email,
            previousStatus: UserStatus.Approved,
            suspendedAt: user.deletedAt.toISOString(),
            pendingReviewAssignmentsCleared:
              clearedAssignments.reviewAssignments,
            pendingApproveAssignmentsCleared:
              clearedAssignments.approveAssignments,
          },
          ip: params.ip,
          userAgent: params.userAgent,
        },
        manager,
      );

      return user;
    });
  }

  async restoreDeletedUser(params: UserLifecycleParams) {
    return this.dataSource.transaction(async (manager) => {
      const userRepo = manager.getRepository(User);
      const user = await userRepo.findOne({ where: { id: params.id } });
      if (!user) {
        throw new NotFoundException('Usuario no encontrado');
      }

      this.userAdminPolicyService.assertTargetIsMutableByAdmin(
        user,
        'No se puede restaurar admins',
      );

      if (user.status !== UserStatus.Deleted) {
        throw new BadRequestException('Usuario no está eliminado');
      }

      user.status = UserStatus.Approved;
      user.deletedAt = null;
      user.deletedById = null;
      user.rejectedAt = null;
      user.rejectedReason = null;
      user.approvedAt = new Date();
      user.approvedById = params.adminId;
      this.applyPermissions(user, DEFAULT_APPROVED_PERMISSIONS);
      this.clearLoginState(user);
      await userRepo.save(user);

      await this.auditLogService.log(
        {
          userId: params.adminId,
          action: 'USER_RESTORED',
          resourceType: 'user',
          resourceId: user.id,
          meta: {
            email: user.email,
            restoredStatus: UserStatus.Approved,
            restoredAt: user.approvedAt.toISOString(),
            defaultPermissionsApplied: true,
          },
          ip: params.ip,
          userAgent: params.userAgent,
        },
        manager,
      );

      return user;
    });
  }

  async permanentlyDeleteUser(params: UserLifecycleParams) {
    return this.dataSource.transaction(async (manager) => {
      const userRepo = manager.getRepository(User);
      const permissionRequestRepo = manager.getRepository(PermissionRequest);
      const documentRepo = manager.getRepository(Document);
      const versionRepo = manager.getRepository(Version);
      const user = await userRepo.findOne({ where: { id: params.id } });
      if (!user) {
        throw new NotFoundException('Usuario no encontrado');
      }

      this.userAdminPolicyService.assertTargetIsMutableByAdmin(
        user,
        'No se puede eliminar admins',
      );

      if (
        user.status !== UserStatus.Approved &&
        user.status !== UserStatus.Deleted
      ) {
        throw new BadRequestException(
          'Solo se pueden eliminar definitivamente usuarios aprobados o eliminados',
        );
      }

      const pendingAssignments = await this.countPendingWorkflowAssignments(
        user.id,
        manager,
      );
      const reviewedPermissionRequestsCleared =
        await permissionRequestRepo.count({
          where: { reviewedById: user.id },
        });
      const approvedUsersCleared = await userRepo.count({
        where: { approvedById: user.id },
      });
      const ownedPermissionRequests = await permissionRequestRepo.count({
        where: { user: { id: user.id } },
      });
      const documentsCreatedDetached = await documentRepo.count({
        where: { createdBy: { id: user.id } },
      });
      const versionsUploadedDetached = await versionRepo.count({
        where: { uploadedBy: { id: user.id } },
      });
      const historicalApprovalAssignmentsDetached = await manager
        .getRepository(DocumentApproval)
        .count({
          where: [
            {
              user: { id: user.id },
              step: ApprovalStep.Reviso,
              decision: ApprovalDecision.Approved,
            },
            {
              user: { id: user.id },
              step: ApprovalStep.Reviso,
              decision: ApprovalDecision.Rejected,
            },
            {
              user: { id: user.id },
              step: ApprovalStep.Aprobo,
              decision: ApprovalDecision.Approved,
            },
            {
              user: { id: user.id },
              step: ApprovalStep.Aprobo,
              decision: ApprovalDecision.Rejected,
            },
          ],
        });

      await this.userDeletionRegistryService.rememberPermanentDeletion(
        user,
        params.adminId,
        manager,
      );

      await manager
        .createQueryBuilder()
        .update('permission_request')
        .set({ reviewedById: null })
        .where('reviewedById = :userId', { userId: user.id })
        .execute();

      await manager
        .createQueryBuilder()
        .update(User)
        .set({ approvedById: null })
        .where('approvedById = :userId', { userId: user.id })
        .execute();

      await userRepo.delete(user.id);

      await this.auditLogService.log(
        {
          userId: params.adminId,
          action: 'USER_HARD_DELETED',
          resourceType: 'user',
          resourceId: user.id,
          meta: {
            email: user.email,
            previousStatus: user.status,
            permanentlyDeletedAt: new Date().toISOString(),
            pendingReviewAssignmentsCleared:
              pendingAssignments.reviewAssignments,
            pendingApproveAssignmentsCleared:
              pendingAssignments.approveAssignments,
            reviewedPermissionRequestsCleared,
            approvedUsersCleared,
            ownedPermissionRequestsDeleted: ownedPermissionRequests,
            documentsCreatedDetached,
            versionsUploadedDetached,
            historicalApprovalAssignmentsDetached,
          },
          ip: params.ip,
          userAgent: params.userAgent,
        },
        manager,
      );

      return { success: true };
    });
  }

  private async clearPendingWorkflowAssignments(
    userId: number,
    manager: EntityManager,
  ) {
    const counts = await this.countPendingWorkflowAssignments(userId, manager);

    await manager.query(
      `
        UPDATE [document_approval]
        SET [userId] = NULL
        WHERE [userId] = @0
          AND [decision] = @1
          AND [step] IN (@2, @3)
      `,
      [userId, ApprovalDecision.Pending, ApprovalStep.Reviso, ApprovalStep.Aprobo],
    );

    return counts;
  }

  private async countPendingWorkflowAssignments(
    userId: number,
    manager: EntityManager,
  ) {
    const approvalRepo = manager.getRepository(DocumentApproval);
    const [reviewAssignments, approveAssignments] = await Promise.all([
      approvalRepo.count({
        where: {
          user: { id: userId },
          step: ApprovalStep.Reviso,
          decision: ApprovalDecision.Pending,
        },
      }),
      approvalRepo.count({
        where: {
          user: { id: userId },
          step: ApprovalStep.Aprobo,
          decision: ApprovalDecision.Pending,
        },
      }),
    ]);

    return { reviewAssignments, approveAssignments };
  }

  private applyPermissions(user: User, permissions: PermissionFlags) {
    user.canAccess = permissions.canAccess;
    user.canRead = permissions.canRead;
    user.canUpload = permissions.canUpload;
    user.canUploadNewVersion = permissions.canUploadNewVersion;
    user.canReview = permissions.canReview;
    user.canApprove = permissions.canApprove;
    user.canDelete = permissions.canDelete;
  }

  private clearLoginState(user: User) {
    user.failedLoginAttempts = 0;
    user.lastFailedLoginAt = null;
    user.loginBlockedUntil = null;
  }
}
