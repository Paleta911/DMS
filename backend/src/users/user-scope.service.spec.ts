import { ForbiddenException } from '@nestjs/common';
import { UserScopeService } from './user-scope.service';
import { UserRole } from './user-role.enum';

describe('UserScopeService', () => {
  const usersService = {
    findByIdWithAreas: jest.fn(),
  };
  const auditLogService = {
    log: jest.fn(),
  };

  let service: UserScopeService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new UserScopeService(
      usersService as never,
      auditLogService as never,
    );
  });

  it('returns null scope for admin users', async () => {
    const scope = await service.getAllowedAreaCodes({
      id: 1,
      role: UserRole.Admin,
    });

    expect(scope).toBeNull();
    expect(usersService.findByIdWithAreas).not.toHaveBeenCalled();
  });

  it('returns explicit area codes for normal users', async () => {
    usersService.findByIdWithAreas.mockResolvedValue({
      allowedAreaCodes: [{ code: 'FA' }, { code: 'RC' }],
    });

    const scope = await service.getAllowedAreaCodes({
      id: 2,
      role: UserRole.User,
    });

    expect(scope).toEqual(['FA', 'RC']);
  });

  it('logs and throws when area is missing but required', async () => {
    await expect(
      service.assertAreaAccess({
        actor: { id: 2, role: UserRole.User },
        requireAreaCode: true,
        resourceType: 'document',
        endpoint: 'POST /documents/upload',
      }),
    ).rejects.toThrow(new ForbiddenException('areaCode requerido para usuarios'));

    expect(auditLogService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'ACCESS_DENIED',
        resourceType: 'document',
      }),
    );
  });

  it('does not log twice when the wrapped operation succeeds', async () => {
    const result = await service.runWithAccessDeniedAudit(
      {
        actor: { id: 3, role: UserRole.User },
        resourceType: 'workflow',
        endpoint: 'GET /documents/:id/workflow',
      },
      async () => 'ok',
    );

    expect(result).toBe('ok');
    expect(auditLogService.log).not.toHaveBeenCalled();
  });
});
