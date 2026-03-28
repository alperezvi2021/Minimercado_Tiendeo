import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { CreditSale } from './credit-sale.entity';

@Entity('credit_payments')
export class CreditPayment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'local_id', nullable: true })
  localId: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'credit_sale_id' })
  creditSaleId: string;

  @ManyToOne(() => CreditSale, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'credit_sale_id' })
  creditSale: CreditSale;

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column({ name: 'payment_date' })
  paymentDate: Date;

  @Column({ name: 'payment_method', default: 'efectivo' })
  paymentMethod: string;

  @Column({ nullable: true })
  notes: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
