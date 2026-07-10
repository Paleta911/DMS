// Admin privilege policy service: enforces admin-specific authorization rules
// Prevents privilege escalation, admin self-service requests, and operations on other admins
import { ForbiddenException, Injectable } from '@nestjs/common';
import { UserRole } from './user-role.enum';

type PrivilegedUser = {
  role: UserRole;
  isSuperAdmin?: boolean | null;
};

@Injectable()
export class UserAdminPolicyService {
  // Check if user is admin or super admin
  isPrivilegedTarget(user: PrivilegedUser | null | undefined) {
    return user?.role === UserRole.Admin || Boolean(user?.isSuperAdmin);
  }

  // Only super admin can create new admins
  assertCanCreateAdmin(actor: PrivilegedUser | null | undefined) {
    if (!actor?.isSuperAdmin) {
      throw new ForbiddenException('Solo super admin puede crear admins');
    }
  }

  // Regular users only: admins cannot request permissions/areas for themselves
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

  // Admin operations cannot target other admins (prevent privilege removal)
  assertTargetIsMutableByAdmin(
    target: PrivilegedUser | null | undefined,
    message: string,
  ) {
    if (this.isPrivilegedTarget(target)) {
      throw new ForbiddenException(message);
    }
  }
}
