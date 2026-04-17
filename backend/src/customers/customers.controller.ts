import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { CustomersService } from './customers.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';

@Controller('customers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @Roles(Role.OWNER, Role.ADMIN, Role.SUPER_ADMIN)
  create(@Request() req, @Body() createCustomerDto: any) {
    return this.customersService.create(
      req.user.tenantId,
      req.user.id,
      req.user.name,
      createCustomerDto,
    );
  }

  @Get()
  findAll(@Request() req, @Query('full') full?: string) {
    return this.customersService.findAll(req.user.tenantId, full === 'true');
  }

  @Get(':id')
  findOne(@Request() req, @Param('id') id: string) {
    return this.customersService.findOne(req.user.tenantId, id);
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.ADMIN, Role.SUPER_ADMIN)
  update(
    @Request() req,
    @Param('id') id: string,
    @Body() updateCustomerDto: any,
  ) {
    return this.customersService.update(
      req.user.tenantId,
      req.user.id,
      req.user.name,
      id,
      updateCustomerDto,
    );
  }

  @Delete(':id')
  @Roles(Role.OWNER, Role.ADMIN, Role.SUPER_ADMIN)
  remove(@Request() req, @Param('id') id: string) {
    return this.customersService.remove(req.user.tenantId, id);
  }
}
