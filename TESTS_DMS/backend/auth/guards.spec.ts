import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { OptionalJwtAuthGuard } from '../../../backend/src/auth/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../../../backend/src/auth/guards/roles.guard';
import { PermissionsGuard } from '../../../backend/src/auth/guards/permissions.guard';
import { SuperAdminGuard } from '../../../backend/src/auth/guards/super-admin.guard';
import { UserRole } from '../../../backend/src/users/user-role.enum';

function createExecutionContext(request: any) {
  return {
    getHandler: () => 'handler',
    getClass: () => 'class',
    switchToHttp: () => ({ getRequest: () => request }),
  } as any;
}

describe('Auth guards external tests', () => {
  it('OptionalJwtAuthGuard returns null when missing user or error', () => {
    const guard = new OptionalJwtAuthGuard();
    expect(guard.handleRequest(null, null)).toBeNull();
    expect(guard.handleRequest(new Error('x'), { id: 1 })).toBeNull();
    expect(guard.handleRequest(null, { id: 1 })).toEqual({ id: 1 });
  });

  it('RolesGuard allows access when no roles required', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(undefined) } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    expect(guard.canActivate(createExecutionContext({ user: { role: UserRole.Admin } }))).toBe(true);
  });

  it('RolesGuard rejects missing role and allows matching role', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue([UserRole.Admin]) } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    expect(() => guard.canActivate(createExecutionContext({ user: { role: UserRole.User } }))).toThrow(ForbiddenException);
    expect(guard.canActivate(createExecutionContext({ user: { role: UserRole.Admin } }))).toBe(true);
  });

  it('PermissionsGuard rejects missing user and audits forbidden permission failures', async () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(['canRead']) } as unknown as Reflector;
    const usersService = { ensurePermissions: jest.fn() };
    const auditLogService = { log: jest.fn().mockResolvedValue(undefined) };
    const guard = new PermissionsGuard(reflector, usersService as any, auditLogService as any);

    await expect(guard.canActivate(createExecutionContext({ headers: {} }))).rejects.toBeInstanceOf(ForbiddenException);

    usersService.ensurePermissions.mockRejectedValue(new ForbiddenException('No'));
    await expect(
      guard.canActivate(createExecutionContext({ user: { id: 1 }, ip: '1.1.1.1', headers: { 'user-agent': 'ua' } })),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(auditLogService.log).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 1, action: 'ACCESS_DENIED', resourceType: 'permissions' }),
    );
  });

  it('PermissionsGuard allows access when permissions succeed', async () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(['canRead']) } as unknown as Reflector;
    const usersService = { ensurePermissions: jest.fn().mockResolvedValue(undefined) };
    const auditLogService = { log: jest.fn() };
    const guard = new PermissionsGuard(reflector, usersService as any, auditLogService as any);

    await expect(
      guard.canActivate(createExecutionContext({ user: { id: 1 }, headers: {} })),
    ).resolves.toBe(true);
  });

  it('SuperAdminGuard validates role and super admin flag', async () => {
    const usersService = { findById: jest.fn() };
    const guard = new SuperAdminGuard(usersService as any);

    await expect(guard.canActivate(createExecutionContext({ user: { id: 1, role: UserRole.User } }))).rejects.toBeInstanceOf(
      ForbiddenException,
    );

    usersService.findById.mockResolvedValue({ isSuperAdmin: false });
    await expect(guard.canActivate(createExecutionContext({ user: { id: 2, role: UserRole.Admin } }))).rejects.toBeInstanceOf(
      ForbiddenException,
    );

    usersService.findById.mockResolvedValue({ isSuperAdmin: true });
    await expect(
      guard.canActivate(createExecutionContext({ user: { id: 3, role: UserRole.Admin } })),
    ).resolves.toBe(true);
  });
});
