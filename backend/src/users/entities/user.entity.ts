import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  nickname: string;

  @Column({ nullable: true })
  avatar: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ unique: true })
  wechat_openid: string;

  @Column({ nullable: true })
  city: string;

  @Column({ default: false })
  is_admin: boolean;

  @CreateDateColumn()
  created_at: Date;
}
