import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Sale } from '../sales/entities/sale.entity';
import { CreditSale } from '../sales/entities/credit-sale.entity';
import { CreditPayment } from '../sales/entities/credit-payment.entity';
import { CashClosure } from '../sales/entities/cash-closure.entity';
import { SupplierInvoice } from '../suppliers/entities/supplier-invoice.entity';
import { InvoiceItem } from '../suppliers/entities/invoice-item.entity';
import { SaleItem } from '../sales/entities/sale-item.entity';

@Injectable()
export class MaintenanceService {
  constructor(
    @InjectRepository(Sale)
    private salesRepo: Repository<Sale>,
    @InjectRepository(CreditSale)
    private creditSalesRepo: Repository<CreditSale>,
    @InjectRepository(CreditPayment)
    private creditPaymentsRepo: Repository<CreditPayment>,
    @InjectRepository(CashClosure)
    private cashClosuresRepo: Repository<CashClosure>,
    @InjectRepository(SupplierInvoice)
    private supplierInvoicesRepo: Repository<SupplierInvoice>,
    @InjectRepository(InvoiceItem)
    private invoiceItemsRepo: Repository<InvoiceItem>,
    @InjectRepository(SaleItem)
    private saleItemsRepo: Repository<SaleItem>,
    private dataSource: DataSource,
  ) {}

  async resetTenantData(tenantId: string) {
    return await this.dataSource.transaction(async (manager) => {
      // Delete in order to satisfy FKs (though some have CASCADE)
      
      // 1. Credit Payments
      await manager.delete(CreditPayment, { tenantId });
      
      // 2. Credit Sales
      await manager.delete(CreditSale, { tenantId });
      
      // 3. Supplier Invoices and Items
      // Some might not have CASCADE DELETE on DB level, so we do it manually
      await manager.delete(InvoiceItem, { tenantId });
      await manager.delete(SupplierInvoice, { tenantId });
      
      // 4. Sales and Items
      // SaleItem has CASCADE DELETE in entity definition, but let's be sure
      await manager.delete(SaleItem, { sale: { tenantId } }); // Custom partial where might be tricky in TypeORM delete
      // Better way for SaleItem:
      await manager.query('DELETE FROM sale_items WHERE sale_id IN (SELECT id FROM sales WHERE tenant_id = $1)', [tenantId]);
      
      await manager.delete(Sale, { tenantId });
      
      // 5. Cash Closures
      await manager.delete(CashClosure, { tenantId });

      return { 
        success: true, 
        message: 'Todos los reportes, créditos y datos contables han sido reiniciados a cero.' 
      };
    });
  }
}
