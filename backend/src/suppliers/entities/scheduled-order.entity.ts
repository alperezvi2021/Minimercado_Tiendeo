import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Supplier } from './supplier.entity';

@Entity('scheduled_orders')
export class ScheduledOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'supplier_id' })
  supplierId: string;

  @ManyToOne(() => Supplier)
  @JoinColumn({ name: 'supplier_id' })
  supplier: Supplier;

  @Column()
  description: string;

  @Column('decimal', { precision: 10, scale: 2 })
  totalAmount: number;

  @Column({ name: 'payment_type' }) // CONTADO, CREDITO
  paymentType: string;

  @Column({ type: 'timestamp' })
  date: Date;

  @Column({ default: 'PENDING' }) // PENDING, COMPLETED, CANCELLED
  status: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
