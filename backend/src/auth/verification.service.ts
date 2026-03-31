import { BadRequestException, HttpException, Injectable } from '@nestjs/common';
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

  constructor(
    @InjectRepository(EmailVerification)
    private readonly verificationRepo: Repository<EmailVerification>,
    private readonly emailService: EmailService,
  ) {
    this.maxAttempts = getEnvNumber('VERIFICATION_MAX_ATTEMPTS', 5);
    this.ttlMinutes = getEnvNumber('VERIFICATION_CODE_TTL_MIN', 15);
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

  async verifyCode(params: { user: User; code: string; ip?: string }) {
    const record = await this.verificationRepo.findOne({
      where: { user: { id: params.user.id } },
      relations: ['user'],
    });
    if (!record) {
      throw new BadRequestException('No hay codigo de verificacion activo');
    }
    if (record.verifyAttempts >= this.maxAttempts) {
      throw new HttpException(
        'Se excedio el numero de intentos. Solicita un nuevo codigo.',
        429,
      );
    }
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
        throw new HttpException(
          'Se excedio el numero de intentos. Solicita un nuevo codigo.',
          429,
        );
      }
      return false;
    }
    return true;
  }
}
