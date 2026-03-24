import { Controller, Post, Body, UseGuards, Request, ForbiddenException, BadRequestException } from '@nestjs/common';
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
  async resetMyData(@Request() req, @Body('confirmText') confirmText: string) {
    if (confirmText !== 'REINICIAR_TODO_A_CEROS') {
      throw new BadRequestException('Confirmación inválida. Escriba exactamente: REINICIAR_TODO_A_CEROS');
    }
    
    // Only Owners or Superadmins can do this
    if (req.user.role !== Role.OWNER && req.user.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('No tienes permisos suficientes para realizar esta acción');
    }
    
    return this.maintenanceService.resetTenantData(req.user.tenantId);
  }
}
