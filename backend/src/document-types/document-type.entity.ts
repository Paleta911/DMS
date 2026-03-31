import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity()
export class DocumentType {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column({ type: 'varchar' })
  code: string;

  @Column({ type: 'varchar' })
  nombreLargo: string;

  @Column({ type: 'bit', default: true })
  activo: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
