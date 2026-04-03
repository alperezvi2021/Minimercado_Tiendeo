export class UpdateProductDto {
  name?: string;
  barcode?: string;
  price?: number;
  cost?: number;
  profitMargin?: number;
  stock?: number;
  lowStockThreshold?: number;
  categoryId?: string;
  isActive?: boolean;
  isService?: boolean;
  isWeightBased?: boolean;
}
