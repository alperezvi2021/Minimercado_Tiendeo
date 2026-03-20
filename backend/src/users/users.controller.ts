import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(Role.OWNER, Role.ADMIN)
  findAll(@Request() req) {
    return this.usersService.findAllByTenant(req.user.tenantId);
  }

  @Post()
  @Roles(Role.OWNER, Role.ADMIN)
  async create(@Request() req, @Body() createUserDto: any) {
    return this.usersService.create({
      ...createUserDto,
      tenantId: req.user.tenantId
    });
  }
}
