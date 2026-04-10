import { Controller, Post, Body, UseGuards, Request, Get, Param, Delete, Patch } from '@nestjs/common';
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
    const { tenantId, userId, role } = req.user;
    const searchUserId = (role === Role.ADMIN || role === Role.OWNER) ? undefined : userId;
    return this.salesService.getCurrentClosureStatus(tenantId, searchUserId);
  }

  @Post('closure/close')
  @Roles(Role.ADMIN, Role.OWNER, Role.CASHIER)
  performClosure(@Request() req) {
    const { tenantId, userId } = req.user;
    return this.salesService.performClosure(tenantId, userId);
  }

  @Post('closure/open')
  @Roles(Role.ADMIN, Role.OWNER, Role.CASHIER)
  openClosure(@Request() req, @Body() body: { openingAmount: number }) {
    const { tenantId, userId, name } = req.user;
    const userName = name || 'Cajero';
    return this.salesService.openClosure(tenantId, userId, userName, body.openingAmount);
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
    const { tenantId, userId, role } = req.user;
    const searchUserId = (role === Role.ADMIN || role === Role.OWNER) ? undefined : userId;
    const status = await this.salesService.getCurrentClosureStatus(tenantId, searchUserId);
    if (!status || !status.closure) return [];
    return this.salesService.findByClosure(tenantId, status.closure.id);
  }

  @Get('closure/payments')
  @Roles(Role.ADMIN, Role.OWNER, Role.CASHIER)
  async getClosurePayments(@Request() req) {
    const { tenantId, userId, role } = req.user;
    const searchUserId = (role === Role.ADMIN || role === Role.OWNER) ? undefined : userId;
    const status = await this.salesService.getCurrentClosureStatus(tenantId, searchUserId);
    if (!status || !status.closure) return [];
    return this.salesService.getPaymentsByClosure(tenantId, status.closure.id);
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

  // --- RESTAURANT MODULE ENDPOINTS ---

  @Get('restaurant/open')
  @Roles(Role.ADMIN, Role.OWNER, Role.CASHIER, Role.WAITER)
  findOpenTables(@Request() req) {
    return this.salesService.findAll(req.user.tenantId, 'OPEN');
  }

  @Post('restaurant/order')
  @Roles(Role.ADMIN, Role.OWNER, Role.CASHIER, Role.WAITER)
  createTableOrder(@Request() req, @Body() body: { tableName: string, waiterId?: string, items: any[] }) {
    const waiterId = body.waiterId || req.user.userId;
    return this.salesService.createTableOrder(req.user.tenantId, waiterId, body);
  }

  @Post('restaurant/order/:id/items')
  @Roles(Role.ADMIN, Role.OWNER, Role.CASHIER, Role.WAITER)
  addItemsToTable(@Request() req, @Param('id') id: string, @Body() body: { items: any[] }) {
    return this.salesService.addItemsToTable(req.user.tenantId, id, body.items);
  }

  @Patch('restaurant/order/:id/items/:itemId')
  @Roles(Role.ADMIN, Role.OWNER, Role.CASHIER, Role.WAITER)
  updateItemQuantity(
    @Request() req, 
    @Param('id') id: string, 
    @Param('itemId') itemId: string, 
    @Body() body: { quantity: number }
  ) {
    return this.salesService.updateItemQuantity(req.user.tenantId, id, itemId, body.quantity);
  }

  @Delete('restaurant/order/:id/items/:itemId')
  @Roles(Role.ADMIN, Role.OWNER, Role.CASHIER, Role.WAITER)
  removeItemFromTable(
    @Request() req, 
    @Param('id') id: string, 
    @Param('itemId') itemId: string
  ) {
    return this.salesService.removeItemFromTable(req.user.tenantId, id, itemId);
  }

  @Post('restaurant/order/:id/close')
  @Roles(Role.ADMIN, Role.OWNER, Role.CASHIER)
  closeTableOrder(
    @Request() req, 
    @Param('id') id: string, 
    @Body() body: { paymentMethod: string, customerId?: string, customerName?: string }
  ) {
    const userId = req.user.userId;
    const userName = req.user.name || 'Cajero';
    return this.salesService.closeTableOrder(req.user.tenantId, userId, userName, id, body);
  }

  @Delete('restaurant/order/:id')
  @Roles(Role.ADMIN, Role.OWNER)
  cancelTableOrder(@Request() req, @Param('id') id: string) {
    return this.salesService.cancelTableOrder(req.user.tenantId, id);
  }
}
