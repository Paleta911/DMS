import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity()
export class AuditLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', nullable: true })
  userId?: number | null;

  @Column({ type: 'varchar' })
  action: string;

  @Column({ type: 'varchar' })
  resourceType: string;

  @Column({ type: 'varchar', nullable: true })
  resourceId?: string | null;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  meta?: string | null;

  @Column({ type: 'varchar', nullable: true })
  ip?: string | null;

  @Column({ type: 'varchar', nullable: true })
  userAgent?: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
