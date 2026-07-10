import { BadRequestException, ConflictException } from '@nestjs/common';
import { UserRole } from '../users/user-role.enum';
import { UserStatus } from '../users/user-status.enum';
import { AuthRegistrationService } from './auth-registration.service';

describe('AuthRegistrationService', () => {
  const usersService = {
    findById: jest.fn(),
    findByEmail: jest.fn(),
    findByEmailWithPassword: jest.fn(),
    createUser: jest.fn(),
    saveUser: jest.fn(),
    setAllowedAreas: jest.fn(),
    toSafeUser: jest.fn((user) => ({
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
    })),
    hasAdmin: jest.fn(),
  };
  const auditLogService = { log: jest.fn() };
  const verificationService = {
    generateCode: jest.fn(() => '123456'),
    createOrRefresh: jest.fn(),
    sendCode: jest.fn().mockResolvedValue({ status: 'SIMULATED' }),
  };
  const userAdminPolicyService = {
    assertCanCreateAdmin: jest.fn(),
  };
  const areaCodesService = {
    findActiveList: jest.fn().mockResolvedValue([
      { code: 'FA', nombre: 'Fabrica' },
    ]),
  };

  let service: AuthRegistrationService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthRegistrationService(
      usersService as never,
      auditLogService as never,
      verificationService as never,
      userAdminPolicyService as never,
      areaCodesService as never,
    );
  });

  it('rechaza registro publico con dominio no permitido', async () => {
    usersService.findByEmail.mockResolvedValue(null);

    await expect(
      service.register({
        nombre: 'Test',
        primerApellido: 'Usuario',
        email: 'usuario@example.com',
        areaCode: 'FA',
        password: 'Password123',
        confirmPassword: 'Password123',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('crea usuario publico pendiente y genera verificacion', async () => {
    usersService.findByEmail.mockResolvedValue(null);
    usersService.createUser.mockImplementation(async (params) => ({
      id: 51,
      email: params.email,
      role: params.role,
      status: params.status,
    }));

    const result = await service.register({
      nombre: 'Test',
      primerApellido: 'Usuario',
      email: 'usuario@bsm.com.mx',
      areaCode: 'FA',
      password: 'Password123',
      confirmPassword: 'Password123',
    });

    expect(usersService.createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'usuario@bsm.com.mx',
        role: UserRole.User,
        status: UserStatus.PendingVerification,
      }),
    );
    expect(verificationService.createOrRefresh).toHaveBeenCalledWith(
      expect.objectContaining({ id: 51 }),
      '123456',
    );
    expect(verificationService.sendCode).toHaveBeenCalledWith(
      expect.objectContaining({ id: 51 }),
      '123456',
    );
    expect(result).toEqual({
      id: 51,
      email: 'usuario@bsm.com.mx',
      role: UserRole.User,
      status: UserStatus.PendingVerification,
    });
  });

  it('permite que un admin cree otro admin sin flujo de verificacion', async () => {
    usersService.findById.mockResolvedValue({
      id: 1,
      email: 'admin@local.com',
      role: UserRole.Admin,
      isSuperAdmin: true,
    });
    usersService.findByEmail.mockResolvedValue(null);
    usersService.createUser.mockImplementation(async (params) => ({
      id: 60,
      email: params.email,
      role: params.role,
      status: params.status,
    }));

    const result = await service.register(
      {
        email: 'otro-admin@local.com',
        password: 'Password123',
        role: UserRole.Admin,
      },
      { actorId: 1 },
    );

    expect(userAdminPolicyService.assertCanCreateAdmin).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1 }),
    );
    expect(usersService.createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'otro-admin@local.com',
        role: UserRole.Admin,
        status: UserStatus.Approved,
      }),
    );
    expect(verificationService.createOrRefresh).not.toHaveBeenCalled();
    expect(result).toEqual({
      id: 60,
      email: 'otro-admin@local.com',
      role: UserRole.Admin,
      status: UserStatus.Approved,
    });
  });

  it('impide bootstrap si ya existe un admin', async () => {
    usersService.hasAdmin.mockResolvedValue(true);
    usersService.findByEmailWithPassword.mockResolvedValue(null);

    await expect(
      service.bootstrapAdmin({
        email: 'admin@local.com',
        password: 'Password123',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('permite reconfigurar el super admin existente en bootstrap', async () => {
    const existing = {
      id: 1,
      email: 'admin@local.com',
      role: UserRole.Admin,
      status: UserStatus.Approved,
      isSuperAdmin: true,
      verifiedAt: null,
      approvedAt: null,
      approvedById: null,
      rejectedAt: new Date('2026-01-01T00:00:00.000Z'),
      rejectedReason: 'previo',
      canAccess: false,
      canRead: false,
      canUpload: false,
      canUploadNewVersion: false,
      canReview: false,
      canApprove: false,
      canDelete: false,
      failedLoginAttempts: 4,
      lastFailedLoginAt: new Date('2026-01-01T00:00:00.000Z'),
      loginBlockedUntil: new Date(Date.now() + 60_000),
      passwordHash: 'old-hash',
    };
    usersService.hasAdmin.mockResolvedValue(true);
    usersService.findByEmailWithPassword.mockResolvedValue(existing);
    usersService.saveUser.mockImplementation(async (user) => user);

    const result = await service.bootstrapAdmin({
      email: 'admin@local.com',
      password: 'Password123',
    });

    expect(usersService.saveUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'admin@local.com',
        isSuperAdmin: true,
        status: UserStatus.Approved,
        canAccess: true,
        canRead: true,
        canUpload: true,
        canUploadNewVersion: true,
        canReview: true,
        canApprove: true,
        canDelete: true,
        failedLoginAttempts: 0,
        lastFailedLoginAt: null,
        loginBlockedUntil: null,
        rejectedAt: null,
        rejectedReason: null,
      }),
    );
    expect(result).toEqual({
      id: 1,
      email: 'admin@local.com',
      role: UserRole.Admin,
      status: UserStatus.Approved,
    });
  });
});
