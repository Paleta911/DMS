import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Document } from '../documents/document.entity';

export enum SearchIndexJobStatus {
  Pending = 'PENDING',
  Failed = 'FAILED',
}

@Entity()
@Index('IDX_search_index_job_status_nextAttemptAt', ['status', 'nextAttemptAt'])
export class SearchIndexJob {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column({ type: 'int' })
  documentId: number;

  @ManyToOne(() => Document, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'documentId' })
  document: Document;

  @Column({ type: 'varchar', default: SearchIndexJobStatus.Pending })
  status: SearchIndexJobStatus;

  @Column({ type: 'int', default: 0 })
  attempts: number;

  @Column({ type: 'datetime2', default: () => 'GETDATE()' })
  nextAttemptAt: Date;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  lastError?: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
