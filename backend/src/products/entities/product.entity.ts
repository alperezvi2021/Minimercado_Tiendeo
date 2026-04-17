import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Category } from '../../categories/entities/category.entity';

@Entity('products')
// El tenantId y el barcode forman una clave única conjunta. Así un código de barras
// puede repetirse en tiendas distintas, pero nunca dentro de la misma tienda.
@Index(['tenantId', 'barcode'], {
  unique: true,
  where: "barcode IS NOT NULL AND barcode != ''",
})
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'local_id', nullable: true })
  localId: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column()
  name: string;

  // Nullable para productos que no tengan código de barras (creados manualmente)
  @Column({ nullable: true })
  barcode: string;

  // Decimal 10,2 idóneo para monedas
  @Column('decimal', { precision: 10, scale: 2 })
  price: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  cost: number;

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  profitMargin: number;

  @Column('float', { default: 0 })
  stock: number;

  @Column('int', { default: 5 }) // Alerta por defecto si hay menos de 5 unidades
  lowStockThreshold: number;

  @Column({ nullable: true })
  categoryId: string;

  @ManyToOne(() => Category, (category) => category.products)
  @JoinColumn({ name: 'categoryId' })
  category: Category;

  @Column({ default: true })
  isActive: boolean;

  // Por si el "producto" es un servicio (ej: recarga, domicilio) que no requiere stock
  @Column({ default: false })
  isService: boolean;

  @Column({ name: 'sell_by_weight', default: false })
  sellByWeight: boolean;

  @Column({ default: 'UND' })
  unit: string; // UND, KG, LB, GM

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
