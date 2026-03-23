export class CreateSaleItemDto {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export class CreateSaleDto {
  totalAmount: number;
  paymentMethod: string;
  customerName?: string;
  customerId?: string;
  items: CreateSaleItemDto[];
}
