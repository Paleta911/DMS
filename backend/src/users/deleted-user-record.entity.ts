import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import {
  USER_EMAIL_MAX_LENGTH,
  USER_NAME_MAX_LENGTH,
} from '../common/field-limits';

@Entity('deleted_user_record')
@Index('IDX_deleted_user_record_email', ['email'], { unique: true })
@Index('IDX_deleted_user_record_original_user_id', ['originalUserId'])
export class DeletedUserRecord {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: USER_EMAIL_MAX_LENGTH })
  email: string;

  @Column({ type: 'varchar', length: USER_NAME_MAX_LENGTH, nullable: true })
  nombre?: string | null;

  @Column({ type: 'varchar', length: USER_NAME_MAX_LENGTH, nullable: true })
  primerApellido?: string | null;

  @Column({ type: 'varchar', length: USER_NAME_MAX_LENGTH, nullable: true })
  segundoApellido?: string | null;

  @Column({ type: 'int', nullable: true })
  originalUserId?: number | null;

  @Column({ type: 'varchar', nullable: true })
  lastKnownStatus?: string | null;

  @Column({ type: 'int', nullable: true })
  deletedById?: number | null;

  @Column({ type: 'datetime' })
  deletedAt: Date;
}
