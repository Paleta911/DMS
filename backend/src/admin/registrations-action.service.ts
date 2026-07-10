import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { UserStatus } from '../users/user-status.enum';
import { DEFAULT_APPROVED_PERMISSIONS } from '../users/permissions';
import { VerificationService } from '../auth/verification.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { UserAdminPolicyService } from '../users/user-admin-policy.service';
import { UserLifecycleService } from '../users/user-lifecycle.service';

// Encapsulates mutating registration actions (approve/reject/restore/resend/force-verify/delete).
// Critical transitions run inside transactions to keep user state and audit logs consistent.
@Injectable()
export class RegistrationsActionService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly verificationService: VerificationService,
    private readonly auditLogService: AuditLogService,
    private readonly userAdminPolicyService: UserAdminPolicyService,
    private readonly userLifecycleService: UserLifecycleService,
  ) {}

  async approve(params: {
    id: number;
    adminId: number;
    ip?: string;
    userAgent?: string;
  }) {
    // Approval grants default approved permissions and clears rejection metadata.
    return this.dataSource.transaction(async (manager) => {
      const userRepo = manager.getRepository(User);
      const user = await userRepo.findOne({ where: { id: params.id } });
      if (!user) {
        throw new NotFoundException('Usuario no encontrado');
      }
      this.userAdminPolicyService.assertTargetIsMutableByAdmin(
        user,
        'No se puede aprobar admins',
      );
      if (user.status !== UserStatus.PendingApproval) {
        throw new BadRequestException(
          'Registro no está pendiente de aprobación',
        );
      }
      user.status = UserStatus.Approved;
      user.approvedAt = new Date();
      user.approvedById = params.adminId;
      user.rejectedAt = null;
      user.rejectedReason = null;
      user.canAccess = DEFAULT_APPROVED_PERMISSIONS.canAccess;
      user.canRead = DEFAULT_APPROVED_PERMISSIONS.canRead;
      user.canUpload = DEFAULT_APPROVED_PERMISSIONS.canUpload;
      user.canUploadNewVersion =
        DEFAULT_APPROVED_PERMISSIONS.canUploadNewVersion;
      user.canReview = DEFAULT_APPROVED_PERMISSIONS.canReview;
      user.canApprove = DEFAULT_APPROVED_PERMISSIONS.canApprove;
      user.canDelete = DEFAULT_APPROVED_PERMISSIONS.canDelete;
      await userRepo.save(user);

      await this.auditLogService.log(
        {
          userId: params.adminId,
          action: 'REG_APPROVED',
          resourceType: 'auth',
          resourceId: user.id,
          meta: { email: user.email },
          ip: params.ip,
          userAgent: params.userAgent,
        },
        manager,
      );

      return user;
    });
  }

  async reject(params: {
    id: number;
    adminId: number;
    reason?: string;
    ip?: string;
    userAgent?: string;
  }) {
    // Rejection keeps account record but blocks access until restored.
    return this.dataSource.transaction(async (manager) => {
      const userRepo = manager.getRepository(User);
      const user = await userRepo.findOne({ where: { id: params.id } });
      if (!user) {
        throw new NotFoundException('Usuario no encontrado');
      }
      this.userAdminPolicyService.assertTargetIsMutableByAdmin(
        user,
        'No se puede rechazar admins',
      );
      user.status = UserStatus.Rejected;
      user.rejectedAt = new Date();
      user.rejectedReason = params.reason ?? null;
      await userRepo.save(user);

      await this.auditLogService.log(
        {
          userId: params.adminId,
          action: 'REG_REJECTED',
          resourceType: 'auth',
          resourceId: user.id,
          meta: { email: user.email, reason: params.reason ?? null },
          ip: params.ip,
          userAgent: params.userAgent,
        },
        manager,
      );

      return user;
    });
  }

  async restore(params: {
    id: number;
    adminId: number;
    ip?: string;
    userAgent?: string;
  }) {
    // Restore picks status based on prior milestones (verified/approved history).
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
      if (user.status !== UserStatus.Rejected) {
        throw new BadRequestException('Registro no está rechazado');
      }

      const restoredStatus = user.approvedAt
        ? UserStatus.Approved
        : user.verifiedAt
          ? UserStatus.PendingApproval
          : UserStatus.PendingVerification;

      user.status = restoredStatus;
      user.rejectedAt = null;
      user.rejectedReason = null;
      if (restoredStatus !== UserStatus.Approved) {
        user.approvedAt = null;
        user.approvedById = null;
      }
      await userRepo.save(user);

      await this.auditLogService.log(
        {
          userId: params.adminId,
          action: 'REG_RESTORED',
          resourceType: 'auth',
          resourceId: user.id,
          meta: { email: user.email, restoredStatus },
          ip: params.ip,
          userAgent: params.userAgent,
        },
        manager,
      );

      return user;
    });
  }

  async resendCode(params: {
    id: number;
    adminId: number;
    ip?: string;
    userAgent?: string;
  }) {
    const user = await this.userRepo.findOne({
      where: { id: params.id },
    });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    if (user.status !== UserStatus.PendingVerification) {
      throw new BadRequestException(
        'Registro no está pendiente de verificación',
      );
    }
    const code = this.verificationService.generateCode();
    await this.verificationService.createOrRefresh(user, code);
    const result = await this.verificationService.sendCode(user, code);

    await this.auditLogService.log({
      userId: params.adminId,
      action: result.status === 'FAILED' ? 'EMAIL_FAILED' : 'EMAIL_SENT',
      resourceType: 'auth',
      resourceId: user.id,
      meta: { email: user.email, status: result.status },
      ip: params.ip,
      userAgent: params.userAgent,
    });

    return result;
  }

  async forceVerify(params: {
    id: number;
    adminId: number;
    ip?: string;
    userAgent?: string;
  }) {
    return this.dataSource.transaction(async (manager) => {
      const userRepo = manager.getRepository(User);
      const user = await userRepo.findOne({ where: { id: params.id } });
      if (!user) {
        throw new NotFoundException('Usuario no encontrado');
      }
      if (user.status !== UserStatus.PendingVerification) {
        throw new BadRequestException(
          'Registro no está pendiente de verificación',
        );
      }
      user.status = UserStatus.PendingApproval;
      user.verifiedAt = new Date();
      await userRepo.save(user);

      await this.auditLogService.log(
        {
          userId: params.adminId,
          action: 'EMAIL_VERIFIED',
          resourceType: 'auth',
          resourceId: user.id,
          meta: { email: user.email, forced: true },
          ip: params.ip,
          userAgent: params.userAgent,
        },
        manager,
      );

      return user;
    });
  }

  async remove(params: {
    id: number;
    adminId: number;
    ip?: string;
    userAgent?: string;
  }) {
    return this.userLifecycleService.suspendUser(params);
  }

  async removePermanent(params: {
    id: number;
    adminId: number;
    ip?: string;
    userAgent?: string;
  }) {
    return this.userLifecycleService.permanentlyDeleteUser(params);
  }
}
