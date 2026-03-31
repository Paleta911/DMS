import { ForbiddenException } from '@nestjs/common';
import { PermissionKey, PERMISSION_FIELDS } from './permissions';
import { UserStatus } from './user-status.enum';

type AccessUser = {
  status: UserStatus;
  canAccess: boolean;
  canRead: boolean;
  canUpload: boolean;
  canUploadNewVersion: boolean;
  canReview: boolean;
  canApprove: boolean;
  canDelete: boolean;
};

export type AssignmentKind = 'review' | 'approve';

type AccessBlockReason =
  | { reason: 'status'; message: string; status: UserStatus }
  | { reason: 'permission'; message: string; permission: PermissionKey.Access };

export function getSystemAccessBlockReason(
  user: Pick<AccessUser, 'status' | 'canAccess'>,
): AccessBlockReason | null {
  if (user.status !== UserStatus.Approved) {
    return {
      reason: 'status',
      message: 'Cuenta pendiente de aprobación',
      status: user.status,
    };
  }
  if (!user.canAccess) {
    return {
      reason: 'permission',
      message: 'Acceso deshabilitado',
      permission: PermissionKey.Access,
    };
  }
  return null;
}

export function assertCanUseSystem(
  user: Pick<AccessUser, 'status' | 'canAccess'>,
) {
  const blockReason = getSystemAccessBlockReason(user);
  if (blockReason) {
    throw new ForbiddenException(blockReason.message);
  }
}

export function assertPermissions(
  user: AccessUser,
  permissions: PermissionKey[],
) {
  assertCanUseSystem(user);
  for (const permission of permissions) {
    const field = PERMISSION_FIELDS[permission];
    if (!user[field]) {
      throw new ForbiddenException(`Permiso requerido: ${permission}`);
    }
  }
}

export function assertAssignmentEligibility(
  user: Pick<AccessUser, 'status' | 'canAccess' | 'canReview' | 'canApprove'>,
  kind: AssignmentKind,
) {
  if (user.status !== UserStatus.Approved) {
    throw new ForbiddenException('Usuario no aprobado');
  }
  if (!user.canAccess) {
    throw new ForbiddenException('Usuario sin acceso');
  }
  if (kind === 'review' && !user.canReview) {
    throw new ForbiddenException('Usuario sin permiso de revision');
  }
  if (kind === 'approve' && !user.canApprove) {
    throw new ForbiddenException('Usuario sin permiso de aprobacion');
  }
}
