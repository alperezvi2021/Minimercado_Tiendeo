import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { SaleItem } from './sale-item.entity';
import { User } from '../../users/entities/user.entity';

@Entity('sales')
@Unique(['tenantId', 'invoiceNumber'])
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

  @Column({ nullable: true })
  sellerName: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'closure_id', nullable: true })
  closureId: string;

  @Column({ default: 'PAID' }) // 'OPEN', 'PAID', 'CANCELLED'
  status: string;

  @Column({ name: 'table_name', nullable: true })
  tableName: string; // Alias o nombre de la mesa/barra

  @Column({ name: 'waiter_id', nullable: true })
  waiterId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'waiter_id' })
  waiter: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToMany(() => SaleItem, (saleItem) => saleItem.sale, { cascade: true })
  items: SaleItem[];
}
