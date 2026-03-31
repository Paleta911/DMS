import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToMany,
} from 'typeorm';
import { User } from '../users/user.entity';

@Entity()
export class AreaCode {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column({ type: 'varchar' })
  code: string;

  @Column({ type: 'varchar' })
  nombre: string;

  @Column({ type: 'bit', default: true })
  activo: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToMany(() => User, (user) => user.allowedAreaCodes)
  users: User[];
}
