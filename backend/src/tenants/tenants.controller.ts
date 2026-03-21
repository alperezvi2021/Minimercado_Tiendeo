import { Controller, Get, Patch, Body, Request, UseGuards } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateTenantDto } from './dto/update-tenant.dto';

@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMyTenant(@Request() req) {
    return this.tenantsService.findOne(req.user.tenantId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  async updateMyTenant(@Request() req, @Body() updateTenantDto: UpdateTenantDto) {
    return this.tenantsService.update(req.user.tenantId, updateTenantDto);
  }
}
