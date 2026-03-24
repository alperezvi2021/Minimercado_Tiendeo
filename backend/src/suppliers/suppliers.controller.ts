import { Controller, Get, Post, Body, UseGuards, Request, Patch, Param, Delete } from '@nestjs/common';
import { SuppliersService } from './suppliers.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';

@Controller('suppliers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Post()
  @Roles(Role.OWNER, Role.ADMIN)
  create(@Request() req: any, @Body() createDto: any) {
    return this.suppliersService.createSupplier(req.user.tenantId, createDto);
  }

  @Get()
  @Roles(Role.OWNER, Role.ADMIN)
  findAll(@Request() req: any) {
    return this.suppliersService.findAllSuppliers(req.user.tenantId);
  }

  @Post('invoices')
  @Roles(Role.OWNER, Role.ADMIN)
  createInvoice(@Request() req: any, @Body() data: any) {
    return this.suppliersService.createInvoice(req.user.tenantId, data);
  }

  @Get('invoices')
  @Roles(Role.OWNER, Role.ADMIN)
  findInvoices(@Request() req: any) {
    return this.suppliersService.findInvoices(req.user.tenantId);
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.ADMIN)
  update(@Request() req: any, @Param('id') id: string, @Body() data: any) {
    return this.suppliersService.updateSupplier(req.user.tenantId, id, data);
  }

  @Delete(':id')
  @Roles(Role.OWNER, Role.ADMIN)
  remove(@Request() req: any, @Param('id') id: string) {
    return this.suppliersService.removeSupplier(req.user.tenantId, id);
  }

  @Patch('invoices/:id')
  @Roles(Role.OWNER, Role.ADMIN)
  updateInvoice(@Param('id') id: string, @Body() data: any, @Request() req: any) {
    return this.suppliersService.updateInvoice(req.user.tenantId, id, data);
  }

  @Delete('invoices/:id')
  @Roles(Role.OWNER, Role.ADMIN)
  removeInvoice(@Param('id') id: string, @Request() req: any) {
    return this.suppliersService.removeInvoice(req.user.tenantId, id);
  }
}
