import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Refund } from './refund.entity';

@Entity('refund_items')
export class RefundItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'refund_id' })
  refundId: string;

  @ManyToOne(() => Refund, (refund) => refund.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'refund_id' })
  refund: Refund;

  @Column({ name: 'product_id' })
  productId: string;

  @Column()
  productName: string;

  @Column('float')
  quantity: number;

  @Column('decimal', { precision: 10, scale: 2 })
  unitPrice: number;

  @Column('decimal', { precision: 10, scale: 2 })
  subtotal: number;

  @Column({ name: 'returns_to_inventory', default: true })
  returnsToInventory: boolean;
}
