import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { PointsProduct } from './points-product.entity';

@Entity('points_orders')
export class PointsOrder {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  user_id: number;

  @Column()
  product_id: number;

  @Column()
  points_spent: number;

  @Column({ default: 'pending' }) // pending | completed | cancelled
  status: string;

  @Column({ nullable: true })
  size: string;

  @Column({ nullable: true, default: 'shipping' }) // shipping | pickup
  delivery_type: string;

  @Column({ nullable: true })
  address_name: string;

  @Column({ nullable: true })
  address_phone: string;

  @Column({ nullable: true })
  address_detail: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => PointsProduct)
  @JoinColumn({ name: 'product_id' })
  product: PointsProduct;

  @CreateDateColumn()
  created_at: Date;
}
