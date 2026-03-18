import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('points_products')
export class PointsProduct {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  image: string;

  @Column()
  points_cost: number;

  @Column({ default: 0 })
  stock: number;

  @Column({ default: 'active' }) // active | inactive
  status: string;

  @Column({ default: 'normal' }) // normal | apparel | shoes | virtual
  product_type: string;

  @Column({ type: 'jsonb', nullable: true })
  size_options: string[];

  @CreateDateColumn()
  created_at: Date;
}
