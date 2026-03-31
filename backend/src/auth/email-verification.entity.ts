import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

export enum EmailSendStatus {
  Pending = 'PENDING',
  Sent = 'SENT',
  Failed = 'FAILED',
  Simulated = 'SIMULATED',
  Console = 'CONSOLE',
}

@Entity()
export class EmailVerification {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => User, (user) => user.emailVerification, {
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  user: User;

  @Column({ type: 'varchar' })
  codeHash: string;

  @Column({ type: 'datetime' })
  expiresAt: Date;

  @Column({ type: 'varchar', default: EmailSendStatus.Pending })
  sendStatus: EmailSendStatus;

  @Column({ type: 'int', default: 0 })
  sendAttempts: number;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  lastError?: string | null;

  @Column({ type: 'datetime', nullable: true })
  sentAt?: Date | null;

  @Column({ type: 'int', default: 0 })
  verifyAttempts: number;

  @Column({ type: 'datetime', nullable: true })
  lastAttemptAt?: Date | null;

  @Column({ type: 'varchar', nullable: true })
  lastAttemptIp?: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
