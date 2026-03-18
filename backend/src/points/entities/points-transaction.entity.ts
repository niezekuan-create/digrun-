import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('points_transactions')
export class PointsTransaction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  user_id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  points_change: number; // positive = earn, negative = spend

  @Column()
  source: string; // event_checkin | mall_exchange

  @Column({ nullable: true })
  related_id: number; // event_id or order_id

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  reason: string;

  @Column({ nullable: true })
  operator_id: number;

  @CreateDateColumn()
  created_at: Date;
}
