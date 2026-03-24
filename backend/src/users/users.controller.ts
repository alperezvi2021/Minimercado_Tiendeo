import { Controller, Get, Post, Body, UseGuards, Request, Param, Patch, Delete } from '@nestjs/common';
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

  @Get(':id')
  @Roles(Role.SUPER_ADMIN, Role.OWNER, Role.ADMIN)
  async findOne(@Request() req, @Param('id') id: string) {
    if (req.user.role !== Role.SUPER_ADMIN) {
      return this.usersService.findOne(id, req.user.tenantId);
    }
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.OWNER, Role.ADMIN)
  async update(@Request() req, @Param('id') id: string, @Body() updateUserDto: any) {
    if (req.user.role !== Role.SUPER_ADMIN) {
      return this.usersService.update(id, updateUserDto, req.user.tenantId);
    }
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN, Role.OWNER, Role.ADMIN)
  async remove(@Request() req, @Param('id') id: string) {
    if (req.user.role !== Role.SUPER_ADMIN) {
      return this.usersService.remove(id, req.user.tenantId);
    }
    return this.usersService.remove(id);
  }
}
