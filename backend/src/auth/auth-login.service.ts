import {
  ForbiddenException,
  HttpException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { LoginDto } from './dto/login.dto';
import { getSystemAccessBlockReason } from '../users/user-access.policy';
import { getEnv, getEnvNumber } from '../common/env.utils';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import type { JwtPayload } from './jwt.strategy';
import { getRequiredEnv } from '../common/security-config.utils';
import type { StringValue } from 'ms';

@Injectable()
export class AuthLoginService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async login(dto: LoginDto, meta?: { ip?: string; userAgent?: string }) {
    const user = await this.usersService.findByEmailWithPassword(dto.email);
    if (!user) {
      await this.auditLogService.log({
        action: 'AUTH_LOGIN_FAIL',
        resourceType: 'auth',
        meta: { email: dto.email },
        ip: meta?.ip,
        userAgent: meta?.userAgent,
      });
      throw new UnauthorizedException('Credenciales invalidas');
    }

    this.ensureNotTemporarilyBlocked(user, meta);

    const isValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isValid) {
      const updatedUser = await this.usersService.recordFailedLoginAttempt(user);
      await this.auditLogService.log({
        userId: user.id,
        action: 'AUTH_LOGIN_FAIL',
        resourceType: 'auth',
        meta: {
          email: dto.email,
          failedLoginAttempts: updatedUser.failedLoginAttempts,
          loginBlockedUntil: updatedUser.loginBlockedUntil?.toISOString() ?? null,
        },
        ip: meta?.ip,
        userAgent: meta?.userAgent,
      });
      if (updatedUser.loginBlockedUntil) {
        throw this.buildLoginBlockedException(updatedUser.loginBlockedUntil);
      }
      throw new UnauthorizedException('Credenciales invalidas');
    }

    if (
      user.failedLoginAttempts > 0 ||
      user.lastFailedLoginAt ||
      user.loginBlockedUntil
    ) {
      await this.usersService.clearFailedLoginState(user);
    }

    const accessBlock = getSystemAccessBlockReason(user);
    if (accessBlock) {
      await this.auditLogService.log({
        userId: user.id,
        action: 'ACCESS_DENIED',
        resourceType: 'auth',
        meta:
          accessBlock.reason === 'status'
            ? { reason: 'status', status: accessBlock.status }
            : { reason: 'permission', permission: accessBlock.permission },
        ip: meta?.ip,
        userAgent: meta?.userAgent,
      });
      throw new ForbiddenException(accessBlock.message);
    }

    const tokens = await this.signAuthTokens({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    await this.auditLogService.log({
      userId: user.id,
      action: 'AUTH_LOGIN_SUCCESS',
      resourceType: 'auth',
      meta: { email: user.email },
      ip: meta?.ip,
      userAgent: meta?.userAgent,
    });

    return {
      ...tokens,
      user: this.usersService.toSafeUser(user),
    };
  }

  async refreshSession(
    dto: RefreshTokenDto,
    meta?: { ip?: string; userAgent?: string },
  ) {
    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(dto.refreshToken, {
        secret: this.getRefreshTokenSecret(),
      });
    } catch {
      await this.auditLogService.log({
        action: 'AUTH_REFRESH_FAIL',
        resourceType: 'auth',
        meta: { reason: 'invalid_refresh_token' },
        ip: meta?.ip,
        userAgent: meta?.userAgent,
      });
      throw new UnauthorizedException('Sesion expirada. Inicia sesión nuevamente');
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('Sesion expirada. Inicia sesión nuevamente');
    }

    this.ensureNotTemporarilyBlocked(user, meta);

    const accessBlock = getSystemAccessBlockReason(user);
    if (accessBlock) {
      await this.auditLogService.log({
        userId: user.id,
        action: 'ACCESS_DENIED',
        resourceType: 'auth',
        meta:
          accessBlock.reason === 'status'
            ? { reason: 'status', status: accessBlock.status }
            : { reason: 'permission', permission: accessBlock.permission },
        ip: meta?.ip,
        userAgent: meta?.userAgent,
      });
      throw new ForbiddenException(accessBlock.message);
    }

    const tokens = await this.signAuthTokens({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    await this.auditLogService.log({
      userId: user.id,
      action: 'AUTH_REFRESH_SUCCESS',
      resourceType: 'auth',
      meta: { email: user.email },
      ip: meta?.ip,
      userAgent: meta?.userAgent,
    });

    return {
      ...tokens,
      user: this.usersService.toSafeUser(user),
    };
  }

  private ensureNotTemporarilyBlocked(
    user: {
      id: number;
      email: string;
      loginBlockedUntil?: Date | null;
    },
    meta?: { ip?: string; userAgent?: string },
  ) {
    const blockedUntil = user.loginBlockedUntil;
    if (!blockedUntil) {
      return;
    }
    if (blockedUntil.getTime() <= Date.now()) {
      return;
    }
    void this.auditLogService.log({
      userId: user.id,
      action: 'AUTH_LOGIN_BLOCKED',
      resourceType: 'auth',
      meta: {
        email: user.email,
        loginBlockedUntil: blockedUntil.toISOString(),
      },
      ip: meta?.ip,
      userAgent: meta?.userAgent,
    });
    throw this.buildLoginBlockedException(blockedUntil);
  }

  private buildLoginBlockedException(blockedUntil: Date) {
    const remainingMs = Math.max(0, blockedUntil.getTime() - Date.now());
    const remainingMin = Math.max(1, Math.ceil(remainingMs / 60000));
    return new HttpException(
      `Cuenta bloqueada temporalmente por intentos fallidos. Intenta de nuevo en ${remainingMin} minuto(s)`,
      429,
    );
  }

  private async signAuthTokens(payload: JwtPayload) {
    const accessToken = await this.jwtService.signAsync(payload);
    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: this.getRefreshTokenSecret(),
      expiresIn: (getEnv('JWT_REFRESH_EXPIRES_IN', '7d') ?? '7d') as StringValue,
    });
    return {
      accessToken,
      refreshToken,
      accessTokenExpiresInSec: Math.max(
        60,
        getEnvNumber('JWT_ACCESS_EXPIRES_IN_SEC', 86400),
      ),
    };
  }

  private getRefreshTokenSecret() {
    return getEnv('JWT_REFRESH_SECRET') ?? getRequiredEnv('JWT_SECRET');
  }
}
