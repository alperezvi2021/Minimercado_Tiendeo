import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Supplier } from './supplier.entity';
import { InvoiceItem } from './invoice-item.entity';

@Entity('supplier_invoices')
export class SupplierInvoice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'invoice_number' })
  invoiceNumber: string;

  @Column({ type: 'timestamp' })
  date: Date;

  @Column()
  supplierId: string;

  @ManyToOne(() => Supplier, (supplier) => supplier.invoices)
  @JoinColumn({ name: 'supplierId' })
  supplier: Supplier;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  totalNet: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  totalTax: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  totalAmount: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  discount: number;

  @Column({ default: false })
  isPaid: boolean;

  @OneToMany(() => InvoiceItem, (item) => item.invoice, { cascade: true })
  items: InvoiceItem[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
