import { IsString, IsNumber, IsArray, ValidateNested, IsOptional, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

class RefundItemDto {
  @IsString()
  productId: string;

  @IsString()
  productName: string;

  @IsNumber()
  quantity: number;

  @IsNumber()
  unitPrice: number;

  @IsNumber()
  subtotal: number;

  @IsBoolean()
  @IsOptional()
  returnsToInventory?: boolean;
}

export class CreateRefundDto {
  @IsString()
  saleId: string;

  @IsNumber()
  totalAmount: number;

  @IsString()
  @IsOptional()
  reason?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RefundItemDto)
  items: RefundItemDto[];
}
