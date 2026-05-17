import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
  Param,
  Patch,
  Delete,
  BadRequestException,
} from '@nestjs/common';
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
      tenantId: req.user.tenantId,
    });
  }

  @Patch('me/password')
  async updateMyPassword(@Request() req, @Body() body: any) {
    const { currentPassword, newPassword } = body;
    if (!newPassword || !currentPassword) {
      throw new BadRequestException('Se requiere la contraseña actual y la nueva contraseña');
    }

    const user = await this.usersService.findOne(req.user.userId);
    if (!user) {
      throw new BadRequestException('Usuario no encontrado');
    }

    const bcrypt = require('bcrypt');
    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      throw new BadRequestException('La contraseña actual es incorrecta');
    }

    return this.usersService.update(req.user.userId, { passwordHash: newPassword });
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
  async update(
    @Request() req,
    @Param('id') id: string,
    @Body() updateUserDto: any,
  ) {
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
