import type { PermissionFlags, UserRole, UserStatus } from './auth';

export type UserProfile = {
  id: number;
  email: string;
  role: UserRole;
  allowedAreaCodes?: string[];
  createdAt?: string;
  status?: UserStatus;
  nombre?: string | null;
  primerApellido?: string | null;
  segundoApellido?: string | null;
  telefono?: string | null;
  fechaNacimiento?: string | null;
  verifiedAt?: string | null;
  approvedAt?: string | null;
  approvedById?: number | null;
  rejectedAt?: string | null;
  rejectedReason?: string | null;
  requestedAreaNombre?: string | null;
  deletedAt?: string | null;
  deletedById?: number | null;
  sendStatus?: string | null;
  sendAttempts?: number;
  lastSentAt?: string | null;
  lastError?: string | null;
  verifyAttempts?: number;
  lastAttemptAt?: string | null;
  isSuperAdmin?: boolean;
  permissions?: PermissionFlags;
  tasks?: {
    pendingReview: number;
    pendingApprove: number;
  };
};

export type UserSearchItem = {
  id: number;
  email: string;
  nombre?: string | null;
  primerApellido?: string | null;
  segundoApellido?: string | null;
  role?: UserRole;
  status?: UserStatus;
  requestedAreaNombre?: string | null;
  allowedAreaCodes?: Array<{
    code: string;
    nombre: string;
  }>;
  canAccess?: boolean;
  canReview?: boolean;
  canApprove?: boolean;
  deletedAt?: string | null;
  deletedById?: number | null;
};
