import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('customers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @Roles('OWNER', 'ADMIN', 'SUPER_ADMIN')
  create(@Request() req, @Body() createCustomerDto: any) {
    return this.customersService.create(req.user.tenantId, createCustomerDto);
  }

  @Get()
  findAll(@Request() req) {
    return this.customersService.findAll(req.user.tenantId);
  }

  @Get(':id')
  findOne(@Request() req, @Param('id') id: string) {
    return this.customersService.findOne(req.user.tenantId, id);
  }

  @Patch(':id')
  @Roles('OWNER', 'ADMIN', 'SUPER_ADMIN')
  update(@Request() req, @Param('id') id: string, @Body() updateCustomerDto: any) {
    return this.customersService.update(req.user.tenantId, id, updateCustomerDto);
  }

  @Delete(':id')
  @Roles('OWNER', 'ADMIN', 'SUPER_ADMIN')
  remove(@Request() req, @Param('id') id: string) {
    return this.customersService.remove(req.user.tenantId, id);
  }
}
