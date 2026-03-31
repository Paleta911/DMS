import {
  BadRequestException,
  HttpException,
  Injectable,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { VerificationService } from './verification.service';
import { getEnvNumber } from '../common/env.utils';
import { UserStatus } from '../users/user-status.enum';

@Injectable()
export class AuthEmailVerificationFlowService {
  private readonly verifyRateLimit = new Map<
    string,
    { count: number; resetAt: number }
  >();

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

    this.applyVerifyRateLimit(dto.email, meta?.ip);

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

  private applyVerifyRateLimit(email: string, ip?: string) {
    const maxAttempts = getEnvNumber('VERIFICATION_MAX_ATTEMPTS', 5);
    const ttlMs = getEnvNumber('VERIFICATION_CODE_TTL_MIN', 15) * 60_000;
    const key = `${email.toLowerCase()}|${ip ?? 'unknown'}`;
    const now = Date.now();
    const existing = this.verifyRateLimit.get(key);
    if (!existing || existing.resetAt <= now) {
      this.verifyRateLimit.set(key, {
        count: 1,
        resetAt: now + ttlMs,
      });
      return;
    }
    existing.count += 1;
    if (existing.count > maxAttempts) {
      throw new HttpException('Demasiados intentos. Intenta mas tarde.', 429);
    }
  }
}
