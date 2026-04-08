import { Controller, Post, Body, UseGuards, Request, ForbiddenException, BadRequestException, Param } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MaintenanceService } from './maintenance.service';
import { Role } from '../auth/enums/role.enum';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('maintenance')
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @UseGuards(JwtAuthGuard)
  @Roles(Role.OWNER, Role.SUPER_ADMIN)
  @Post('reset-my-data')
  async resetMyData(@Request() req, @Body() options: any) {
    const { confirmText, ...resetOptions } = options;
    if (confirmText !== 'REINICIAR_TODO_A_CEROS') {
      throw new BadRequestException('Confirmación inválida. Escriba exactamente: REINICIAR_TODO_A_CEROS');
    }
    
    return this.maintenanceService.resetTenantData(req.user.tenantId, resetOptions);
  }

  @UseGuards(JwtAuthGuard)
  @Roles(Role.SUPER_ADMIN)
  @Post('admin-reset/:tenantId')
  async adminResetTenant(@Request() req, @Body() options: any, @Param('tenantId') tenantId: string) {
    const { confirmText, ...resetOptions } = options;
    if (confirmText !== 'REINICIAR_SISTEMA_GLOBAL') {
      throw new BadRequestException('Confirmación inválida para SuperAdmin. Escriba exactamente: REINICIAR_SISTEMA_GLOBAL');
    }
    
    return this.maintenanceService.resetTenantData(tenantId, resetOptions);
  }
  @UseGuards(JwtAuthGuard)
  @Roles(Role.OWNER, Role.SUPER_ADMIN)
  @Post('cleanup-duplicates')
  async cleanupDuplicates() {
    return this.maintenanceService.cleanupDuplicateInvoices();
  }
}
