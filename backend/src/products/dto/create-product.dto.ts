export class CreateProductDto {
  name: string;
  barcode?: string;
  price: number;
  cost?: number;
  profitMargin?: number;
  stock?: number;
  lowStockThreshold?: number;
  categoryId?: string;
  isService?: boolean;
  localId?: string;
}
