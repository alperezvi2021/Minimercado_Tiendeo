import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MaintenanceService } from './maintenance.service';
import { MaintenanceController } from './maintenance.controller';
import { Sale } from '../sales/entities/sale.entity';
import { CreditSale } from '../sales/entities/credit-sale.entity';
import { CreditPayment } from '../sales/entities/credit-payment.entity';
import { CashClosure } from '../sales/entities/cash-closure.entity';
import { SupplierInvoice } from '../suppliers/entities/supplier-invoice.entity';
import { InvoiceItem } from '../suppliers/entities/invoice-item.entity';
import { SaleItem } from '../sales/entities/sale-item.entity';

import { Refund } from '../sales/entities/refund.entity';
import { RefundItem } from '../sales/entities/refund-item.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Sale,
      CreditSale,
      CreditPayment,
      CashClosure,
      SupplierInvoice,
      InvoiceItem,
      SaleItem,
      Refund,
      RefundItem,
    ]),
  ],
  controllers: [MaintenanceController],
  providers: [MaintenanceService],
  exports: [MaintenanceService],
})
export class MaintenanceModule {}
