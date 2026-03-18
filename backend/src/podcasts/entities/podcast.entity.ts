import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity()
export class Podcast {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ nullable: true })
  episode: number;

  @Column('text', { nullable: true })
  description: string;

  @Column()
  audio_url: string;

  @Column({ nullable: true })
  cover_url: string;

  @Column({ nullable: true })
  duration: number; // seconds

  @CreateDateColumn()
  created_at: Date;
}
