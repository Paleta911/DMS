import {
  Column,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class DocumentVisibilityPolicy {
  @PrimaryColumn({ type: 'int' })
  id: number;

  @Column({ type: 'bit', default: true })
  draftVisibleToUsers: boolean;

  @Column({ type: 'bit', default: true })
  inReviewVisibleToUsers: boolean;

  @Column({ type: 'bit', default: true })
  approvedVisibleToUsers: boolean;

  @Column({ type: 'bit', default: true })
  obsoleteVisibleToUsers: boolean;

  @UpdateDateColumn()
  updatedAt: Date;
}
