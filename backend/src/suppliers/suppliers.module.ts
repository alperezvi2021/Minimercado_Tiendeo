import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SuppliersService } from './suppliers.service';
import { SuppliersController } from './suppliers.controller';
import { Supplier } from './entities/supplier.entity';
import { SupplierInvoice } from './entities/supplier-invoice.entity';
import { InvoiceItem } from './entities/invoice-item.entity';

import { Expense } from './entities/expense.entity';
import { ScheduledOrder } from './entities/scheduled-order.entity';

import { SalesModule } from '../sales/sales.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Supplier, SupplierInvoice, InvoiceItem, Expense, ScheduledOrder]),
    SalesModule,
  ],
  controllers: [SuppliersController],
  providers: [SuppliersService],
  exports: [SuppliersService],
})
export class SuppliersModule {}
