import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';

@Controller('categories')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @Roles(Role.ADMIN, Role.OWNER)
  create(@Body() createCategoryDto: any, @Request() req: any) {
    return this.categoriesService.create(createCategoryDto, req.user.tenantId);
  }

  @Get()
  @Roles(Role.ADMIN, Role.OWNER, Role.CASHIER)
  findAll(@Request() req: any) {
    return this.categoriesService.findAll(req.user.tenantId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.categoriesService.findOne(id, req.user.tenantId);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.OWNER)
  update(@Param('id') id: string, @Body() updateCategoryDto: any, @Request() req: any) {
    return this.categoriesService.update(id, updateCategoryDto, req.user.tenantId);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.OWNER)
  remove(@Param('id') id: string, @Request() req: any) {
    return this.categoriesService.remove(id, req.user.tenantId);
  }
}
