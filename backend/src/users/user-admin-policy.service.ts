import { ForbiddenException, Injectable } from '@nestjs/common';
import { UserRole } from './user-role.enum';

type PrivilegedUser = {
  role: UserRole;
  isSuperAdmin?: boolean | null;
};

@Injectable()
export class UserAdminPolicyService {
  isPrivilegedTarget(user: PrivilegedUser | null | undefined) {
    return user?.role === UserRole.Admin || Boolean(user?.isSuperAdmin);
  }

  assertCanCreateAdmin(actor: PrivilegedUser | null | undefined) {
    if (!actor?.isSuperAdmin) {
      throw new ForbiddenException('Solo super admin puede crear admins');
    }
  }

  assertCanCreateSelfServiceRequest(
    actor: PrivilegedUser | null | undefined,
    resourceLabel: string,
  ) {
    if (this.isPrivilegedTarget(actor)) {
      throw new ForbiddenException(
        `Admins no pueden solicitar ${resourceLabel}`,
      );
    }
  }

  assertTargetIsMutableByAdmin(
    target: PrivilegedUser | null | undefined,
    message: string,
  ) {
    if (this.isPrivilegedTarget(target)) {
      throw new ForbiddenException(message);
    }
  }
}
