import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('tenants')
  findAllTenants() {
    return this.adminService.findAllTenants();
  }

  @Get('users')
  findAllUsers() {
    return this.adminService.findAllUsers();
  }

  @Post('users/:id/reset-password')
  resetPassword(@Param('id') id: string, @Body('newPassword') pass: string) {
    return this.adminService.resetUserPassword(id, pass);
  }

  @Patch('tenants/:id/modules')
  updateTenantModules(@Param('id') id: string, @Body('modules') modules: string[]) {
    return this.adminService.updateTenantModules(id, modules);
  }

  @Patch('tenants/:id/status')
  updateTenantStatus(@Param('id') id: string, @Body('isActive') isActive: boolean) {
    return this.adminService.updateTenantStatus(id, isActive);
  }
}
