import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, OneToMany } from 'typeorm';
import { Registration } from '../../registrations/entities/registration.entity';

@Entity()
export class Event {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column()
  date: Date;

  @Column()
  location: string;

  @Column()
  route: string;

  @Column('text')
  description: string;

  @Column()
  max_people: number;

  @Column({ nullable: true })
  cover_image: string;

  @Column({ default: true })
  is_active: boolean;

  @Column({ type: 'jsonb', nullable: true })
  form_config: any;

  @Column({ default: 'draft' }) // draft | published | finished
  status: string;

  @OneToMany(() => Registration, (registration) => registration.event)
  registrations: Registration[];

  @CreateDateColumn()
  created_at: Date;
}
