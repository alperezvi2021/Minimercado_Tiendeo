import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, OneToMany } from 'typeorm';
import { SaleItem } from './sale-item.entity';

@Entity('sales')
export class Sale {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column('decimal', { precision: 10, scale: 2 })
  totalAmount: number;

  @Column({ name: 'invoice_number', nullable: true })
  invoiceNumber: string;

  @Column({ name: 'payment_method', default: 'efectivo' })
  paymentMethod: string; // 'efectivo', 'tarjeta', 'credito'

  @Column({ name: 'customer_name', nullable: true })
  customerName: string;

  @Column({ name: 'user_id', nullable: true })
  userId: string;

  @Column({ name: 'closure_id', nullable: true })
  closureId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToMany(() => SaleItem, saleItem => saleItem.sale, { cascade: true })
  items: SaleItem[];
}
