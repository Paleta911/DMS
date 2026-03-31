import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { Document } from './document.entity';
import { User } from '../users/user.entity';

export enum ApprovalStep {
  Elaboro = 'ELABORO',
  Reviso = 'REVISO',
  Aprobo = 'APROBO',
}

export enum ApprovalDecision {
  Pending = 'PENDING',
  Approved = 'APPROVED',
  Rejected = 'REJECTED',
}

@Entity()
export class DocumentApproval {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Document, (document) => document.approvals, {
    onDelete: 'CASCADE',
  })
  document: Document;

  @Column({ type: 'varchar' })
  step: ApprovalStep;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  user?: User | null;

  @Column({ type: 'varchar' })
  decision: ApprovalDecision;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  comentario?: string | null;

  @Column({ type: 'datetime', nullable: true })
  decidedAt?: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
