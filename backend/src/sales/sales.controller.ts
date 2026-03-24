import { Controller, Post, Body, UseGuards, Request, Get, Param } from '@nestjs/common';
import { SalesService } from './sales.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { CreateRefundDto } from './dto/create-refund.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post()
  @Roles(Role.ADMIN, Role.OWNER, Role.CASHIER)
  create(@Request() req, @Body() createSaleDto: CreateSaleDto) {
    const tenantId = req.user.tenantId;
    const userId = req.user.userId;
    const userName = req.user.name || 'Cajero';
    return this.salesService.create(tenantId, userId, userName, createSaleDto);
  }

  @Get('closure/status')
  @Roles(Role.ADMIN, Role.OWNER, Role.CASHIER)
  getClosureStatus(@Request() req) {
    const tenantId = req.user.tenantId;
    const userId = req.user.userId;
    return this.salesService.getCurrentClosureStatus(tenantId, userId);
  }

  @Post('closure/close')
  @Roles(Role.ADMIN, Role.OWNER, Role.CASHIER)
  performClosure(@Request() req) {
    const tenantId = req.user.tenantId;
    const userId = req.user.userId;
    // The provided code snippet for accounting logic was malformed and placed incorrectly.
    // Assuming the intent was to add accounting logic to the closure process,
    // this would typically involve fetching sales/invoices and then calculating.
    // For now, I'm restoring the original `performClosure` method body.
    // If you intended to add specific accounting calculations here, please provide
    // the full, correct context including where `sales`, `cashAndCardSales`, etc.,
    // would be obtained.
    return this.salesService.performClosure(tenantId, userId);
  }

  @Post('mark-credit')
  @Roles(Role.ADMIN, Role.OWNER, Role.CASHIER)
  markAsCredit(@Request() req, @Body() body: { saleId: string; customerName: string }) {
    const tenantId = req.user.tenantId;
    return this.salesService.markAsCredit(tenantId, body.saleId, body.customerName);
  }

  @Get('closure/sales')
  @Roles(Role.ADMIN, Role.OWNER, Role.CASHIER)
  async getClosureSales(@Request() req) {
    const tenantId = req.user.tenantId;
    const userId = req.user.userId;
    const status = await this.salesService.getCurrentClosureStatus(tenantId, userId);
    if (!status || !status.closure) return [];
    return this.salesService.findByClosure(tenantId, status.closure.id);
  }

  @Get('credits/pending')
  @Roles(Role.ADMIN, Role.OWNER, Role.CASHIER)
  findAllPendingCredits(@Request() req) {
    const tenantId = req.user.tenantId;
    return this.salesService.findAllPendingCredits(tenantId);
  }

  @Post('credits/:id/pay')
  @Roles(Role.ADMIN, Role.OWNER, Role.CASHIER)
  payCredit(@Request() req, @Param('id') id: string) {
    const tenantId = req.user.tenantId;
    const userId = req.user.userId;
    const userName = req.user.name || 'Cajero';
    return this.salesService.payCreditSale(tenantId, id, userId, userName);
  }

  @Post(':id/pay-from-closure')
  @Roles(Role.ADMIN, Role.OWNER, Role.CASHIER)
  async payFromClosure(@Request() req, @Param('id') id: string) {
    const tenantId = req.user.tenantId;
    const userId = req.user.userId;
    const userName = req.user.name || 'Cajero';
    await this.salesService.paySale(tenantId, id, userId, userName);
    return { success: true };
  }

  @Get()
  @Roles(Role.ADMIN, Role.OWNER)
  findAll(@Request() req) {
    const tenantId = req.user.tenantId;
    return this.salesService.findAll(tenantId);
  }

  @Post('sync-credits')
  @Roles(Role.ADMIN, Role.OWNER, Role.SUPER_ADMIN)
  syncCredits(@Request() req) {
    const tenantId = req.user.tenantId;
    return this.salesService.syncCredits(tenantId);
  }

  @Post('credits/:id/partial-payment')
  @Roles(Role.ADMIN, Role.OWNER, Role.CASHIER)
  registerPartialPayment(@Request() req, @Param('id') id: string, @Body() body: { amount: number; notes?: string }) {
    const tenantId = req.user.tenantId;
    const userId = req.user.userId;
    const userName = req.user.name || 'Cajero';
    return this.salesService.registerPartialPayment(tenantId, id, body.amount, userId, userName, body.notes);
  }

  @Get('credits/:id/history')
  @Roles(Role.ADMIN, Role.OWNER, Role.CASHIER)
  getCreditHistory(@Request() req, @Param('id') id: string) {
    const tenantId = req.user.tenantId;
    return this.salesService.getCreditHistory(tenantId, id);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.OWNER)
  findOne(@Request() req, @Param('id') id: string) {
    const tenantId = req.user.tenantId;
    return this.salesService.findOne(tenantId, id);
  }

  @Post('refunds')
  @Roles(Role.ADMIN, Role.OWNER, Role.CASHIER)
  createRefund(@Request() req, @Body() createRefundDto: CreateRefundDto) {
    const tenantId = req.user.tenantId;
    const userId = req.user.userId;
    const userName = req.user.name || 'Cajero';
    return this.salesService.createRefund(tenantId, userId, userName, createRefundDto);
  }
}
