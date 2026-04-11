import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { VerificationService } from './verification.service';
import { UserStatus } from '../users/user-status.enum';
import { VerificationEmailDto } from './dto/verification-email.dto';

@Injectable()
export class AuthEmailVerificationFlowService {
  constructor(
    private readonly usersService: UsersService,
    private readonly auditLogService: AuditLogService,
    private readonly verificationService: VerificationService,
  ) {}

  async verifyEmail(
    dto: VerifyEmailDto,
    meta?: { ip?: string; userAgent?: string },
  ) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new BadRequestException('Usuario no encontrado');
    }
    if (user.status === UserStatus.Rejected) {
      throw new BadRequestException('Registro rechazado');
    }
    if (user.status !== UserStatus.PendingVerification) {
      return {
        status: user.status,
        verifiedAt: user.verifiedAt ?? null,
      };
    }

    const valid = await this.verificationService.verifyCode({
      user,
      code: dto.code,
      ip: meta?.ip,
    });
    if (!valid) {
      await this.auditLogService.log({
        userId: user.id,
        action: 'EMAIL_VERIFY_FAILED',
        resourceType: 'auth',
        meta: { email: user.email },
        ip: meta?.ip,
        userAgent: meta?.userAgent,
      });
      throw new BadRequestException('Codigo invalido');
    }

    user.status = UserStatus.PendingApproval;
    user.verifiedAt = new Date();
    await this.usersService.saveUser(user);

    await this.auditLogService.log({
      userId: user.id,
      action: 'EMAIL_VERIFIED',
      resourceType: 'auth',
      meta: { email: user.email },
      ip: meta?.ip,
      userAgent: meta?.userAgent,
    });

    return this.usersService.toSafeUser(user);
  }

  async resendCode(
    dto: VerificationEmailDto,
    meta?: { ip?: string; userAgent?: string },
  ) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new BadRequestException('Usuario no encontrado');
    }
    if (user.status === UserStatus.Rejected) {
      throw new BadRequestException('Registro rechazado');
    }
    if (user.status !== UserStatus.PendingVerification) {
      throw new BadRequestException('El correo ya no requiere verificación');
    }

    const currentRecord = await this.verificationService.getByUserId(user.id);
    const verifyAvailability = this.verificationService.getVerifyAvailability(currentRecord);
    if (verifyAvailability.remainingSec > 0 && verifyAvailability.blockedUntil) {
      this.verificationService.assertCanVerify(currentRecord);
    }
    const availability = this.verificationService.assertCanResend(currentRecord);

    const code = this.verificationService.generateCode();
    await this.verificationService.createOrRefresh(user, code);
    const result = await this.verificationService.sendCode(user, code);
    const nextRecord = await this.verificationService.getByUserId(user.id);
    const nextAvailability = this.verificationService.getResendAvailability(nextRecord);
    const nextVerifyAvailability = this.verificationService.getVerifyAvailability(nextRecord);

    await this.auditLogService.log({
      userId: user.id,
      action: result.status === 'FAILED' ? 'EMAIL_FAILED' : 'EMAIL_SENT',
      resourceType: 'auth',
      meta: {
        email: user.email,
        status: result.status,
        previousNextAllowedAt: availability.nextAllowedAt,
        nextAllowedAt: nextAvailability.nextAllowedAt,
      },
      ip: meta?.ip,
      userAgent: meta?.userAgent,
    });

    return {
      status: result.status,
      ...nextAvailability,
      canVerify: nextVerifyAvailability.canVerify,
      verifyRemainingSec: nextVerifyAvailability.remainingSec,
      verifyBlockedUntil: nextVerifyAvailability.blockedUntil,
    };
  }

  async getVerificationStatus(dto: VerificationEmailDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new BadRequestException('Usuario no encontrado');
    }

    const record = await this.verificationService.getByUserId(user.id);
    const availability = this.verificationService.getResendAvailability(record);
    const verifyAvailability = this.verificationService.getVerifyAvailability(record);

    return {
      email: user.email,
      status: user.status,
      canResend: availability.canResend && verifyAvailability.remainingSec === 0,
      remainingSec: availability.remainingSec,
      nextAllowedAt: availability.nextAllowedAt,
      lastSentAt: availability.lastSentAt,
      expiresAt: availability.expiresAt,
      sendStatus: availability.sendStatus,
      canVerify: verifyAvailability.canVerify,
      verifyRemainingSec: verifyAvailability.remainingSec,
      verifyBlockedUntil: verifyAvailability.blockedUntil,
    };
  }
}
