import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Event } from '../../events/entities/event.entity';

@Entity()
export class Registration {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  user_id: number;

  @Column()
  event_id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Event)
  @JoinColumn({ name: 'event_id' })
  event: Event;

  @Column({ nullable: true })
  name: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  pace: string;

  @Column({ nullable: true })
  distance: string;

  @Column({ nullable: true })
  top_size: string;

  @Column({ nullable: true })
  pants_size: string;

  @Column({ nullable: true })
  shoe_size: string;

  @Column({ default: false })
  bag_storage: boolean;

  @Column({ default: false })
  coffee: boolean;

  @Column({ type: 'jsonb', nullable: true })
  form_data: any;

  @Column({ default: 'pending' }) // pending | approved | checked_in | cancelled
  status: string;

  @Column({ nullable: true })
  approved_by: number;

  @Column({ nullable: true })
  approved_at: Date;

  @Column({ nullable: true })
  cancelled_at: Date;

  @Column({ nullable: true })
  checkin_time: Date;

  @CreateDateColumn()
  created_at: Date;
}
