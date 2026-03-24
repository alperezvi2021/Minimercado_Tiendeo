import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SalesService } from './sales.service';
import { SalesController } from './sales.controller';
import { Sale } from './entities/sale.entity';
import { SaleItem } from './entities/sale-item.entity';
import { CreditSale } from './entities/credit-sale.entity';
import { CreditPayment } from './entities/credit-payment.entity';
import { CashClosure } from './entities/cash-closure.entity';
import { ProductsModule } from '../products/products.module';
import { Customer } from '../customers/entities/customer.entity';
import { Refund } from './entities/refund.entity';
import { RefundItem } from './entities/refund-item.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Sale, SaleItem, CreditSale, CreditPayment, CashClosure, Customer, Refund, RefundItem]),
    ProductsModule,
  ],
  controllers: [SalesController],
  providers: [SalesService],
  exports: [SalesService],
})
export class SalesModule {}
