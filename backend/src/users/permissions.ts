export enum PermissionKey {
  Access = 'ACCESS',
  Read = 'READ',
  Upload = 'UPLOAD',
  UploadNewVersion = 'UPLOAD_NEW_VERSION',
  Review = 'REVIEW',
  Approve = 'APPROVE',
  Delete = 'DELETE',
}

export const PERMISSION_FIELDS: Record<PermissionKey, keyof PermissionFlags> = {
  [PermissionKey.Access]: 'canAccess',
  [PermissionKey.Read]: 'canRead',
  [PermissionKey.Upload]: 'canUpload',
  [PermissionKey.UploadNewVersion]: 'canUploadNewVersion',
  [PermissionKey.Review]: 'canReview',
  [PermissionKey.Approve]: 'canApprove',
  [PermissionKey.Delete]: 'canDelete',
};

export type PermissionFlags = {
  canAccess: boolean;
  canRead: boolean;
  canUpload: boolean;
  canUploadNewVersion: boolean;
  canReview: boolean;
  canApprove: boolean;
  canDelete: boolean;
};

export const DEFAULT_APPROVED_PERMISSIONS: PermissionFlags = {
  canAccess: true,
  canRead: true,
  canUpload: false,
  canUploadNewVersion: false,
  canReview: false,
  canApprove: false,
  canDelete: false,
};

export const FULL_PERMISSIONS: PermissionFlags = {
  canAccess: true,
  canRead: true,
  canUpload: true,
  canUploadNewVersion: true,
  canReview: true,
  canApprove: true,
  canDelete: true,
};
