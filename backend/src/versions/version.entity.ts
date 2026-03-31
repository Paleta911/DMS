// src/versions/version.entity.ts

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { Document } from '../documents/document.entity';
import { User } from '../users/user.entity';
import { VersionTextSource } from './version-text-source.enum';

@Entity()
export class Version {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  storedName: string;

  @Column()
  originalName: string;

  @Column({ type: 'nvarchar', nullable: true })
  comentario?: string | null;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  contentText?: string | null;

  @Column({
    type: 'nvarchar',
    length: 20,
    default: VersionTextSource.None,
  })
  textSource: VersionTextSource;

  @Column({ default: false })
  ocrApplied: boolean;

  @Column({ type: 'int', nullable: true })
  ocrPageCount?: number | null;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Document, (document) => document.versions)
  document: Document;

  @ManyToOne(() => User, (user) => user.uploads, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  uploadedBy?: User | null;
}
