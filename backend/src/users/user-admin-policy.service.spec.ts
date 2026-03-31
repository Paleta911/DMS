import { ForbiddenException } from '@nestjs/common';
import { UserAdminPolicyService } from './user-admin-policy.service';
import { UserRole } from './user-role.enum';

describe('UserAdminPolicyService', () => {
  const service = new UserAdminPolicyService();

  it('allows super admin to create admins', () => {
    expect(() =>
      service.assertCanCreateAdmin({
        role: UserRole.Admin,
        isSuperAdmin: true,
      }),
    ).not.toThrow();
  });

  it('blocks non super admin from creating admins', () => {
    expect(() =>
      service.assertCanCreateAdmin({
        role: UserRole.Admin,
        isSuperAdmin: false,
      }),
    ).toThrow(new ForbiddenException('Solo super admin puede crear admins'));
  });

  it('blocks privileged users from self service requests', () => {
    expect(() =>
      service.assertCanCreateSelfServiceRequest(
        { role: UserRole.Admin, isSuperAdmin: false },
        'permisos',
      ),
    ).toThrow(new ForbiddenException('Admins no pueden solicitar permisos'));
  });

  it('allows normal users to create self service requests', () => {
    expect(() =>
      service.assertCanCreateSelfServiceRequest(
        { role: UserRole.User, isSuperAdmin: false },
        'áreas',
      ),
    ).not.toThrow();
  });

  it('blocks privileged targets from mutable admin actions', () => {
    expect(() =>
      service.assertTargetIsMutableByAdmin(
        { role: UserRole.Admin, isSuperAdmin: false },
        'No se puede modificar permisos de admins',
      ),
    ).toThrow(
      new ForbiddenException('No se puede modificar permisos de admins'),
    );
  });
});
