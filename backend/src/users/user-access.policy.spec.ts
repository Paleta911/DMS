import { ForbiddenException } from '@nestjs/common';
import {
  assertAssignmentEligibility,
  assertCanUseSystem,
  assertPermissions,
  getSystemAccessBlockReason,
} from './user-access.policy';
import { PermissionKey } from './permissions';
import { UserStatus } from './user-status.enum';

const baseUser = {
  status: UserStatus.Approved,
  canAccess: true,
  canRead: true,
  canUpload: false,
  canUploadNewVersion: false,
  canReview: true,
  canApprove: true,
  canDelete: false,
};

describe('user-access.policy', () => {
  it('returns block reason when status is not approved', () => {
    const result = getSystemAccessBlockReason({
      status: UserStatus.PendingApproval,
      canAccess: true,
    });
    expect(result).toEqual({
      reason: 'status',
      message: 'Cuenta pendiente de aprobación',
      status: UserStatus.PendingApproval,
    });
  });

  it('throws when system access is disabled', () => {
    expect(() =>
      assertCanUseSystem({
        status: UserStatus.Approved,
        canAccess: false,
      }),
    ).toThrow(ForbiddenException);
  });

  it('throws when required permission is missing', () => {
    expect(() =>
      assertPermissions(
        {
          ...baseUser,
          canUpload: false,
        },
        [PermissionKey.Upload],
      ),
    ).toThrow('Permiso requerido: UPLOAD');
  });

  it('allows permission checks when user is approved and has permissions', () => {
    expect(() =>
      assertPermissions(
        {
          ...baseUser,
          canUpload: true,
          canDelete: true,
        },
        [PermissionKey.Upload, PermissionKey.Delete],
      ),
    ).not.toThrow();
  });

  it('throws when reviewer assignment user cannot review', () => {
    expect(() =>
      assertAssignmentEligibility(
        {
          status: UserStatus.Approved,
          canAccess: true,
          canReview: false,
          canApprove: true,
        },
        'review',
      ),
    ).toThrow('Usuario sin permiso de revision');
  });
});
