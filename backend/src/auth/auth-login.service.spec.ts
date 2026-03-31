import {
  HttpException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { AuditLogService } from '../audit-log/audit-log.service';
import { AuthLoginService } from './auth-login.service';
import { UserRole } from '../users/user-role.enum';
import { UserStatus } from '../users/user-status.enum';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
}));

describe('AuthLoginService', () => {
  const baseUser = {
    id: 9,
    email: 'admin@local.com',
    role: UserRole.Admin,
    status: UserStatus.Approved,
    canAccess: true,
    passwordHash: 'hashed',
    failedLoginAttempts: 0,
    lastFailedLoginAt: null,
    loginBlockedUntil: null,
  };

  let usersService: {
    findByEmailWithPassword: jest.Mock;
    findById: jest.Mock;
    toSafeUser: jest.Mock;
    recordFailedLoginAttempt: jest.Mock;
    clearFailedLoginState: jest.Mock;
  };
  let jwtService: {
    signAsync: jest.Mock;
    verifyAsync: jest.Mock;
  };
  let auditLogService: {
    log: jest.Mock;
  };
  let service: AuthLoginService;

  beforeEach(() => {
    process.env.JWT_SECRET = 'test_jwt_secret_2026';
    process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_2026';
    process.env.JWT_REFRESH_EXPIRES_IN = '7d';
    process.env.JWT_ACCESS_EXPIRES_IN_SEC = '86400';

    usersService = {
      findByEmailWithPassword: jest.fn(),
      findById: jest.fn(),
      toSafeUser: jest.fn((user) => ({ id: user.id, email: user.email })),
      recordFailedLoginAttempt: jest.fn(),
      clearFailedLoginState: jest.fn(),
    };
    jwtService = {
      signAsync: jest.fn().mockResolvedValueOnce('access-token').mockResolvedValueOnce(
        'refresh-token',
      ),
      verifyAsync: jest.fn(),
    };
    auditLogService = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    service = new AuthLoginService(
      usersService as any,
      jwtService as unknown as JwtService,
      auditLogService as unknown as AuditLogService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns access and refresh tokens on successful login', async () => {
    usersService.findByEmailWithPassword.mockResolvedValue({ ...baseUser });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    const result = await service.login({
      email: baseUser.email,
      password: 'Admin123',
    });

    expect(result).toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      accessTokenExpiresInSec: 86400,
      user: { id: 9, email: 'admin@local.com' },
    });
    expect(usersService.clearFailedLoginState).not.toHaveBeenCalled();
    expect(auditLogService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'AUTH_LOGIN_SUCCESS',
      }),
    );
  });

  it('blocks login when failed attempts trigger a temporary lockout', async () => {
    usersService.findByEmailWithPassword.mockResolvedValue({ ...baseUser });
    usersService.recordFailedLoginAttempt.mockResolvedValue({
      ...baseUser,
      failedLoginAttempts: 5,
      loginBlockedUntil: new Date(Date.now() + 15 * 60 * 1000),
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    await expect(
      service.login({ email: baseUser.email, password: 'wrong' }),
    ).rejects.toBeInstanceOf(HttpException);
    expect(usersService.recordFailedLoginAttempt).toHaveBeenCalled();
  });

  it('rejects invalid credentials when the password does not match', async () => {
    usersService.findByEmailWithPassword.mockResolvedValue({ ...baseUser });
    usersService.recordFailedLoginAttempt.mockResolvedValue({
      ...baseUser,
      failedLoginAttempts: 1,
      loginBlockedUntil: null,
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    await expect(
      service.login({ email: baseUser.email, password: 'wrong' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('renews the session with a refresh token', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      sub: baseUser.id,
      email: baseUser.email,
      role: baseUser.role,
    });
    jwtService.signAsync = jest
      .fn()
      .mockResolvedValueOnce('access-token-2')
      .mockResolvedValueOnce('refresh-token-2');
    usersService.findById.mockResolvedValue({ ...baseUser });

    const result = await service.refreshSession({
      refreshToken: 'valid-refresh-token',
    });

    expect(result).toEqual({
      accessToken: 'access-token-2',
      refreshToken: 'refresh-token-2',
      accessTokenExpiresInSec: 86400,
      user: { id: 9, email: 'admin@local.com' },
    });
    expect(auditLogService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'AUTH_REFRESH_SUCCESS',
      }),
    );
  });

  it('rejects invalid refresh tokens', async () => {
    jwtService.verifyAsync.mockRejectedValue(new Error('invalid'));

    await expect(
      service.refreshSession({ refreshToken: 'bad-token' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
