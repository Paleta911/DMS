import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { AuthRegistrationService } from './auth-registration.service';
import { AuthLoginService } from './auth-login.service';
import { AuthEmailVerificationFlowService } from './auth-email-verification-flow.service';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { VerificationEmailDto } from './dto/verification-email.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly authRegistrationService: AuthRegistrationService,
    private readonly authLoginService: AuthLoginService,
    private readonly authEmailVerificationFlowService: AuthEmailVerificationFlowService,
  ) {}

  async register(
    dto: RegisterDto,
    meta?: { actorId?: number; ip?: string; userAgent?: string },
  ) {
    // Thin facade: orchestration lives in specialized auth services.
    return this.authRegistrationService.register(dto, meta);
  }

  async bootstrapAdmin(dto: CreateUserDto) {
    return this.authRegistrationService.bootstrapAdmin(dto);
  }

  async login(dto: LoginDto, meta?: { ip?: string; userAgent?: string }) {
    return this.authLoginService.login(dto, meta);
  }

  async verifyEmail(
    dto: VerifyEmailDto,
    meta?: { ip?: string; userAgent?: string },
  ) {
    return this.authEmailVerificationFlowService.verifyEmail(dto, meta);
  }

  async resendVerificationCode(
    dto: VerificationEmailDto,
    meta?: { ip?: string; userAgent?: string },
  ) {
    return this.authEmailVerificationFlowService.resendCode(dto, meta);
  }

  async getVerificationStatus(dto: VerificationEmailDto) {
    return this.authEmailVerificationFlowService.getVerificationStatus(dto);
  }

  async refreshSession(
    dto: RefreshTokenDto,
    meta?: { ip?: string; userAgent?: string },
  ) {
    // Refresh flow is delegated so token policy stays centralized.
    return this.authLoginService.refreshSession(dto, meta);
  }
}
