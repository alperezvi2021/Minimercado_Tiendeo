import { Injectable } from '@nestjs/common';
import { SalesService } from '../sales/sales.service';
import { SuppliersService } from '../suppliers/suppliers.service';

@Injectable()
export class AccountingService {
  constructor(
    private salesService: SalesService,
    private suppliersService: SuppliersService,
  ) {}

  async getFinancialSummary(tenantId: string) {
    const sales = await this.salesService.findAll(tenantId);
    const invoices = await this.suppliersService.findInvoices(tenantId);

    const cashAndCardSales = sales.filter(s => s.paymentMethod !== 'credito');
    const creditSales = sales.filter(s => s.paymentMethod === 'credito');

    const totalRevenue = sales.reduce((sum, sale) => sum + Number(sale.totalAmount || 0), 0);
    const totalCashRevenue = cashAndCardSales.reduce((sum, sale) => sum + Number(sale.totalAmount || 0), 0);
    
    // INTEGRITY FIX: Include credit payments in cash revenue
    const payments = await this.salesService.findAllPayments(tenantId);
    const totalPaymentsReceived = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    
    const finalCashRevenue = totalCashRevenue + totalPaymentsReceived;
    const accountsReceivable = creditSales.reduce((sum, sale) => sum + Number(sale.totalAmount || 0), 0) - totalPaymentsReceived;
    
    const totalExpenses = invoices.reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0);
    
    return {
      totalRevenue: totalRevenue || 0,
      totalCashRevenue: finalCashRevenue || 0,
      accountsReceivable: accountsReceivable || 0,
      totalExpenses: totalExpenses || 0,
      grossProfit: (totalRevenue - totalExpenses) || 0,
      salesCount: sales.length,
      purchasesCount: invoices.length,
      paymentsReceived: totalPaymentsReceived,
    };
  }
}
