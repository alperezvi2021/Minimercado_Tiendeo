import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { SupplierInvoice } from './supplier-invoice.entity';

@Entity('invoice_items')
export class InvoiceItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column()
  invoiceId: string;

  @ManyToOne(() => SupplierInvoice, (invoice) => invoice.items)
  @JoinColumn({ name: 'invoiceId' })
  invoice: SupplierInvoice;

  @Column()
  description: string;

  @Column('float')
  quantity: number;

  @Column('decimal', { precision: 12, scale: 2 })
  unitNetValue: number;

  @Column('decimal', { precision: 12, scale: 2 })
  totalNetValue: number;

  @Column('decimal', { precision: 5, scale: 2, default: 0 })
  taxRate: number; // Ej: 19 para 19%

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  taxAmount: number;

  @Column('decimal', { precision: 12, scale: 2 })
  totalItemAmount: number;
}
