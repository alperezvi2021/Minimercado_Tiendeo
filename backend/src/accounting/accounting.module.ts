import { Module } from '@nestjs/common';
import { AccountingService } from './accounting.service';
import { AccountingController } from './accounting.controller';
import { SalesModule } from '../sales/sales.module';
import { SuppliersModule } from '../suppliers/suppliers.module';

@Module({
  imports: [SalesModule, SuppliersModule],
  controllers: [AccountingController],
  providers: [AccountingService],
})
export class AccountingModule {}
