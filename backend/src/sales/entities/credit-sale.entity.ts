import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Sale } from './sale.entity';
import { CreditPayment } from './credit-payment.entity';

@Entity('credit_sales')
export class CreditSale {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'sale_id' })
  saleId: string;

  @ManyToOne(() => Sale, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sale_id' })
  sale: Sale;

  @Column({ name: 'customer_name', nullable: true })
  customerName: string;

  @Column({ name: 'customer_id', nullable: true })
  customerId: string;

  @ManyToOne('Customer', 'creditSales', { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customer_id' })
  customer: any;

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column('decimal', {
    name: 'remaining_amount',
    precision: 10,
    scale: 2,
    default: 0,
  })
  remainingAmount: number;

  @Column({ default: 'PENDING' }) // PENDING, PARTIAL, PAID
  status: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'paid_at', nullable: true })
  paidAt: Date;

  @OneToMany(() => CreditPayment, (payment) => payment.creditSale)
  payments: CreditPayment[];
}
