// Permission system: defines fine-grained access control flags for documents and areas
// Maps permission keys to database column names; includes default sets for different user types
export enum PermissionKey {
  Access = 'ACCESS',
  Read = 'READ',
  Upload = 'UPLOAD',
  UploadNewVersion = 'UPLOAD_NEW_VERSION',
  Review = 'REVIEW',
  Approve = 'APPROVE',
  Delete = 'DELETE',
}

// Maps permission enum to database boolean column names
export const PERMISSION_FIELDS: Record<PermissionKey, keyof PermissionFlags> = {
  [PermissionKey.Access]: 'canAccess',
  [PermissionKey.Read]: 'canRead',
  [PermissionKey.Upload]: 'canUpload',
  [PermissionKey.UploadNewVersion]: 'canUploadNewVersion',
  [PermissionKey.Review]: 'canReview',
  [PermissionKey.Approve]: 'canApprove',
  [PermissionKey.Delete]: 'canDelete',
};

// Authorization flags: typically scoped to a user's area assignment
export type PermissionFlags = {
  canAccess: boolean;
  canRead: boolean;
  canUpload: boolean;
  canUploadNewVersion: boolean;
  canReview: boolean;
  canApprove: boolean;
  canDelete: boolean;
};

// Approved but non-admin user: read-only access within assigned area
export const DEFAULT_APPROVED_PERMISSIONS: PermissionFlags = {
  canAccess: true,
  canRead: true,
  canUpload: false,
  canUploadNewVersion: false,
  canReview: false,
  canApprove: false,
  canDelete: false,
};

// Admin user: full permissions across all documents
export const FULL_PERMISSIONS: PermissionFlags = {
  canAccess: true,
  canRead: true,
  canUpload: true,
  canUploadNewVersion: true,
  canReview: true,
  canApprove: true,
  canDelete: true,
};
