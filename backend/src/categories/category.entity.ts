// src/categories/category.entity.ts

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Document } from '../documents/document.entity';

@Entity()
export class Category {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column()
  nombre: string;

  @Column({ type: 'bit', default: true })
  activo: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => Document, (document) => document.category)
  documents: Document[];
}
