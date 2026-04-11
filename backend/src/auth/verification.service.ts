import {
  BadRequestException,
  HttpException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { EmailVerification, EmailSendStatus } from './email-verification.entity';
import { EmailService } from '../email/email.service';
import { getEnvNumber } from '../common/env.utils';
import { User } from '../users/user.entity';

@Injectable()
export class VerificationService {
  private readonly maxAttempts: number;
  private readonly ttlMinutes: number;
  private readonly resendCooldownSec: number;

  constructor(
    @InjectRepository(EmailVerification)
    private readonly verificationRepo: Repository<EmailVerification>,
    private readonly emailService: EmailService,
  ) {
    this.maxAttempts = getEnvNumber('VERIFICATION_MAX_ATTEMPTS', 5);
    this.ttlMinutes = getEnvNumber('VERIFICATION_CODE_TTL_MIN', 15);
    this.resendCooldownSec = Math.max(
      60,
      getEnvNumber('VERIFICATION_RESEND_COOLDOWN_SEC', 60),
    );
  }

  generateCode() {
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  private buildExpiresAt() {
    const now = new Date();
    return new Date(now.getTime() + this.ttlMinutes * 60_000);
  }

  async createOrRefresh(user: User, code: string) {
    const codeHash = await bcrypt.hash(code, 10);
    let record = await this.verificationRepo.findOne({
      where: { user: { id: user.id } },
      relations: ['user'],
    });
    if (!record) {
      record = this.verificationRepo.create({
        user,
        codeHash,
        expiresAt: this.buildExpiresAt(),
        sendStatus: EmailSendStatus.Pending,
        sendAttempts: 0,
        verifyAttempts: 0,
      });
    } else {
      record.codeHash = codeHash;
      record.expiresAt = this.buildExpiresAt();
      record.sendStatus = EmailSendStatus.Pending;
      record.verifyAttempts = 0;
      record.lastAttemptAt = null;
      record.lastAttemptIp = null;
    }
    return this.verificationRepo.save(record);
  }

  async sendCode(user: User, code: string) {
    const record = await this.verificationRepo.findOne({
      where: { user: { id: user.id } },
      relations: ['user'],
    });
    if (!record) {
      throw new BadRequestException('Registro de verificacion no encontrado');
    }
    record.sendAttempts += 1;
    const result = await this.emailService.sendVerificationCode({
      to: user.email,
      code,
      nombre: user.nombre ?? null,
    });
    record.sendStatus = result.status;
    record.sentAt = new Date();
    record.lastError = result.status === EmailSendStatus.Failed ? result.error ?? null : null;
    await this.verificationRepo.save(record);
    return result;
  }

  async getByUserId(userId: number) {
    return this.verificationRepo.findOne({
      where: { user: { id: userId } },
      relations: ['user'],
    });
  }

  getResendAvailability(record?: EmailVerification | null) {
    const sentAtMs = record?.sentAt?.getTime() ?? 0;
    const nextAllowedAtMs = sentAtMs + this.resendCooldownSec * 1000;
    const remainingSec =
      sentAtMs > 0
        ? Math.max(0, Math.ceil((nextAllowedAtMs - Date.now()) / 1000))
        : 0;

    return {
      cooldownSec: this.resendCooldownSec,
      remainingSec,
      canResend: remainingSec === 0,
      nextAllowedAt:
        sentAtMs > 0 ? new Date(nextAllowedAtMs).toISOString() : null,
      lastSentAt: record?.sentAt?.toISOString?.() ?? null,
      expiresAt: record?.expiresAt?.toISOString?.() ?? null,
      sendStatus: record?.sendStatus ?? null,
    };
  }

  getVerifyAvailability(record?: EmailVerification | null) {
    const expiresAtMs = record?.expiresAt?.getTime() ?? 0;
    const verifyAttempts = record?.verifyAttempts ?? 0;
    const now = Date.now();
    const isExpired = expiresAtMs > 0 && expiresAtMs <= now;
    const isBlocked = Boolean(record) && !isExpired && verifyAttempts >= this.maxAttempts;
    const remainingSec =
      isBlocked && expiresAtMs > 0
        ? Math.max(0, Math.ceil((expiresAtMs - now) / 1000))
        : 0;

    return {
      canVerify: Boolean(record) && !isExpired && !isBlocked,
      remainingSec,
      blockedUntil:
        isBlocked && expiresAtMs > 0
          ? new Date(expiresAtMs).toISOString()
          : null,
    };
  }

  assertCanResend(record?: EmailVerification | null) {
    const availability = this.getResendAvailability(record);
    if (!availability.canResend) {
      throw new HttpException(
        `Espera ${availability.remainingSec} segundo(s) antes de solicitar un nuevo código`,
        429,
      );
    }
    return availability;
  }

  assertCanVerify(record?: EmailVerification | null) {
    const availability = this.getVerifyAvailability(record);
    if (!availability.canVerify && availability.remainingSec > 0) {
      throw this.buildVerifyBlockedException(
        availability.blockedUntil
          ? new Date(availability.blockedUntil)
          : new Date(),
      );
    }
    return availability;
  }

  async verifyCode(params: { user: User; code: string; ip?: string }) {
    const record = await this.verificationRepo.findOne({
      where: { user: { id: params.user.id } },
      relations: ['user'],
    });
    if (!record) {
      throw new BadRequestException('No hay codigo de verificacion activo');
    }
    this.assertCanVerify(record);

    const now = new Date();
    if (record.expiresAt.getTime() < now.getTime()) {
      throw new BadRequestException('Codigo expirado');
    }

    const valid = await bcrypt.compare(params.code, record.codeHash);
    record.verifyAttempts += 1;
    record.lastAttemptAt = now;
    record.lastAttemptIp = params.ip ?? null;
    await this.verificationRepo.save(record);
    if (!valid) {
      if (record.verifyAttempts >= this.maxAttempts) {
        throw this.buildVerifyBlockedException(record.expiresAt);
      }
      return false;
    }
    return true;
  }

  private buildVerifyBlockedException(blockedUntil: Date) {
    const remainingMs = Math.max(0, blockedUntil.getTime() - Date.now());
    const remainingSec = Math.max(1, Math.ceil(remainingMs / 1000));

    return new HttpException(
      {
        statusCode: 429,
        code: 'AUTH_VERIFY_EMAIL_CODE_BLOCKED',
        message:
          'Se agotaron los intentos para este código. Espera a que termine el contador.',
        remainingSec,
        blockedUntil: blockedUntil.toISOString(),
      },
      429,
    );
  }
}
