// src/documents/document.entity.ts

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Version } from '../versions/version.entity';
import { Category } from '../categories/category.entity';
import { DocumentType } from '../document-types/document-type.entity';
import { AreaCode } from '../area-codes/area-code.entity';
import { User } from '../users/user.entity';
import { DocumentStatus } from './document-status.enum';
import { DocumentApproval } from './document-approval.entity';

@Entity()
export class Document {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  nombre: string;

  @Column({ type: 'varchar', default: DocumentStatus.Draft })
  status: DocumentStatus;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  createdBy?: User | null;

  @ManyToOne(() => DocumentType, { nullable: true, onDelete: 'SET NULL' })
  documentType?: DocumentType | null;

  @ManyToOne(() => AreaCode, { nullable: true, onDelete: 'SET NULL' })
  areaCode?: AreaCode | null;

  @Column({ type: 'int', nullable: true })
  consecutivo?: number | null;

  @Index('IDX_document_codigo', {
    unique: true,
    where: '[codigo] IS NOT NULL',
  })
  @Column({ type: 'varchar', nullable: true })
  codigo?: string | null;

  @ManyToOne(() => Category, (category) => category.documents, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  category?: Category | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Version, (version) => version.document)
  versions: Version[];

  @OneToMany(() => DocumentApproval, (approval) => approval.document)
  approvals: DocumentApproval[];
}
