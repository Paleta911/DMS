import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  OneToMany,
  ManyToMany,
  JoinTable,
  OneToOne,
} from 'typeorm';
import { Version } from '../versions/version.entity';
import { UserRole } from './user-role.enum';
import { AreaCode } from '../area-codes/area-code.entity';
import { UserStatus } from './user-status.enum';
import { EmailVerification } from '../auth/email-verification.entity';
import {
  USER_EMAIL_MAX_LENGTH,
  USER_NAME_MAX_LENGTH,
  USER_PHONE_MAX_LENGTH,
  USER_REQUESTED_AREA_MAX_LENGTH,
} from '../common/field-limits';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: USER_EMAIL_MAX_LENGTH })
  email: string;

  @Column({ select: false })
  passwordHash: string;

  @Column({ type: 'varchar', default: UserRole.User })
  role: UserRole;

  @Column({ type: 'varchar', length: USER_NAME_MAX_LENGTH, nullable: true })
  nombre?: string | null;

  @Column({ type: 'varchar', length: USER_NAME_MAX_LENGTH, nullable: true })
  primerApellido?: string | null;

  @Column({ type: 'varchar', length: USER_NAME_MAX_LENGTH, nullable: true })
  segundoApellido?: string | null;

  @Column({ type: 'varchar', length: USER_PHONE_MAX_LENGTH, nullable: true })
  telefono?: string | null;

  @Column({ type: 'date', nullable: true })
  fechaNacimiento?: Date | null;

  @Column({ type: 'varchar', default: UserStatus.PendingVerification })
  status: UserStatus;

  @Column({ type: 'datetime', nullable: true })
  verifiedAt?: Date | null;

  @Column({ type: 'datetime', nullable: true })
  approvedAt?: Date | null;

  @Column({ type: 'int', nullable: true })
  approvedById?: number | null;

  @Column({ type: 'datetime', nullable: true })
  rejectedAt?: Date | null;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  rejectedReason?: string | null;

  @Column({ type: 'datetime', nullable: true })
  deletedAt?: Date | null;

  @Column({ type: 'int', nullable: true })
  deletedById?: number | null;

  @Column({
    type: 'nvarchar',
    length: USER_REQUESTED_AREA_MAX_LENGTH,
    nullable: true,
  })
  requestedAreaNombre?: string | null;

  @Column({ type: 'bit', default: false })
  isSuperAdmin: boolean;

  @Column({ type: 'bit', default: false })
  canAccess: boolean;

  @Column({ type: 'bit', default: false })
  canRead: boolean;

  @Column({ type: 'bit', default: false })
  canUpload: boolean;

  @Column({ type: 'bit', default: false })
  canUploadNewVersion: boolean;

  @Column({ type: 'bit', default: false })
  canReview: boolean;

  @Column({ type: 'bit', default: false })
  canApprove: boolean;

  @Column({ type: 'bit', default: false })
  canDelete: boolean;

  @Column({ type: 'int', default: 0 })
  failedLoginAttempts: number;

  @Column({ type: 'datetime', nullable: true })
  lastFailedLoginAt?: Date | null;

  @Column({ type: 'datetime', nullable: true })
  loginBlockedUntil?: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => Version, (version) => version.uploadedBy)
  uploads: Version[];

  @ManyToMany(() => AreaCode, (area) => area.users, { cascade: false })
  @JoinTable({ name: 'user_area_codes' })
  allowedAreaCodes: AreaCode[];

  @OneToOne(() => EmailVerification, (verification) => verification.user)
  emailVerification?: EmailVerification | null;
}
