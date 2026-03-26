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
import { Refund } from '../sales/entities/refund.entity';
import { RefundItem } from '../sales/entities/refund-item.entity';

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
    @InjectRepository(Refund)
    private refundRepo: Repository<Refund>,
    @InjectRepository(RefundItem)
    private refundItemRepo: Repository<RefundItem>,
    private dataSource: DataSource,
  ) {}

  async resetTenantData(tenantId: string, options: {
    cleanSales?: boolean;
    cleanCredits?: boolean;
    cleanCashClosures?: boolean;
    cleanRefunds?: boolean;
    cleanSupplierInvoices?: boolean;
  } = {}) {
    return await this.dataSource.transaction(async (manager) => {
      const results = [];

      // 1. Credit Payments (Dependent on Credits)
      if (options.cleanCredits) {
        await manager.delete(CreditPayment, { tenantId });
        await manager.delete(CreditSale, { tenantId });
        results.push('Créditos y abonos');
      }
      
      // 2. Supplier Invoices and Items (Explicitly requested NOT to delete by default)
      if (options.cleanSupplierInvoices) {
        await manager.delete(InvoiceItem, { tenantId });
        await manager.delete(SupplierInvoice, { tenantId });
        results.push('Facturas de proveedores');
      }
      
      // 3. Refunds and Items
      if (options.cleanRefunds) {
        await manager.query('DELETE FROM refund_items WHERE refund_id IN (SELECT id FROM refunds WHERE tenant_id = $1)', [tenantId]);
        await manager.delete(Refund, { tenantId });
        results.push('Devoluciones');
      }

      // 4. Sales and Items
      if (options.cleanSales) {
        await manager.query('DELETE FROM sale_items WHERE sale_id IN (SELECT id FROM sales WHERE tenant_id = $1)', [tenantId]);
        await manager.delete(Sale, { tenantId });
        results.push('Ventas y facturas de venta');
      }
      
      // 5. Cash Closures
      if (options.cleanCashClosures) {
        await manager.delete(CashClosure, { tenantId });
        results.push('Cierres de caja');
      }

      const message = results.length > 0 
        ? `Se han reiniciado los siguientes datos: ${results.join(', ')}.`
        : 'No se seleccionaron datos para reiniciar.';

      return { success: true, message };
    });
  }
}
