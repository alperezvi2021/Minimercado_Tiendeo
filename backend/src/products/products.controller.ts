import { Controller, Get, Post, Body, Param, UseGuards, Request, Patch, Delete } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @Roles(Role.ADMIN, Role.OWNER)
  create(@Request() req, @Body() createProductDto: CreateProductDto) {
    const tenantId = req.user.tenantId;
    return this.productsService.create(tenantId, createProductDto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.OWNER, Role.CASHIER)
  findAll(@Request() req) {
    const tenantId = req.user.tenantId;
    return this.productsService.findAll(tenantId);
  }

  @Get('barcode/:code')
  findOneByBarcode(@Request() req, @Param('code') barcode: string) {
    const tenantId = req.user.tenantId;
    return this.productsService.findOneByBarcode(tenantId, barcode);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.OWNER)
  update(@Request() req, @Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    const tenantId = req.user.tenantId;
    return this.productsService.update(tenantId, id, updateProductDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.OWNER)
  remove(@Request() req, @Param('id') id: string) {
    const tenantId = req.user.tenantId;
    return this.productsService.remove(tenantId, id);
  }
}
