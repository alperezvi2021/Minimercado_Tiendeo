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
    const expenses = await this.suppliersService.findAllExpenses(tenantId);

    const cashAndCardSales = sales.filter(s => s.paymentMethod !== 'credito');
    const creditSales = sales.filter(s => s.paymentMethod === 'credito');

    const totalRevenue = sales.reduce((sum, sale) => sum + Number(sale.totalAmount || 0), 0);
    const totalCashRevenue = cashAndCardSales.reduce((sum, sale) => sum + Number(sale.totalAmount || 0), 0);
    
    // INTEGRITY FIX: Include credit payments in cash revenue
    const payments = await this.salesService.findAllPayments(tenantId);
    const totalPaymentsReceived = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    
    const finalCashRevenue = totalCashRevenue + totalPaymentsReceived;
    const accountsReceivable = creditSales.reduce((sum, sale) => sum + Number(sale.totalAmount || 0), 0) - totalPaymentsReceived;
    
    const totalPurchases = invoices.reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0);
    const totalOtherExpenses = expenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
    const totalExpenses = totalPurchases + totalOtherExpenses;
    
    const refunds = await this.salesService.findAllRefunds(tenantId);
    const totalRefunds = refunds.reduce((sum, r) => sum + Number(r.totalAmount || 0), 0);
    
    return {
      totalRevenue: (totalRevenue - totalRefunds) || 0,
      totalCashRevenue: (finalCashRevenue - totalRefunds) || 0,
      accountsReceivable: accountsReceivable || 0,
      totalExpenses: totalExpenses || 0,
      totalPurchases: totalPurchases || 0,
      totalOtherExpenses: totalOtherExpenses || 0,
      grossProfit: (totalRevenue - totalRefunds - totalExpenses) || 0,
      salesCount: sales.length,
      purchasesCount: invoices.length,
      expensesCount: expenses.length,
      paymentsReceived: totalPaymentsReceived,
    };
  }
}
