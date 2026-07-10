import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
} from 'typeorm';
import { User } from '../users/user.entity';

export enum PermissionRequestStatus {
  Pending = 'PENDING',
  Approved = 'APPROVED',
  Rejected = 'REJECTED',
}

export enum PermissionRequestType {
  Permissions = 'PERMISSIONS',
  Areas = 'AREAS',
}

// Persistence model for both permission and area self-service requests.
// Requested values are stored as JSON strings for backward compatibility.
@Entity()
export class PermissionRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @Column({ type: 'nvarchar', length: 'MAX' })
  requestedPermissions: string;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  requestedAreaCodes?: string | null;

  @Column({ type: 'varchar', default: PermissionRequestType.Permissions })
  requestType: PermissionRequestType;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  comment?: string | null;

  @Column({ type: 'varchar', default: PermissionRequestStatus.Pending })
  status: PermissionRequestStatus;

  @Column({ type: 'int', nullable: true })
  reviewedById?: number | null;

  @Column({ type: 'datetime', nullable: true })
  reviewedAt?: Date | null;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  reviewReason?: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
