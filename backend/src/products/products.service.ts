import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { Product } from './entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private productsRepository: Repository<Product>,
  ) {}

  async create(tenantId: string, createProductDto: CreateProductDto): Promise<Product> {
    // Si tiene barcode, verificar que no exista
    if (createProductDto.barcode) {
      const existing = await this.productsRepository.findOne({
        where: { tenantId, barcode: createProductDto.barcode }
      });
      if (existing) {
        throw new ConflictException('Ya existe un producto con este código de barras en tu tienda');
      }
    }

    const product = this.productsRepository.create({
      ...createProductDto,
      tenantId,
    });
    return this.productsRepository.save(product);
  }

  async findAll(tenantId: string): Promise<Product[]> {
    return this.productsRepository.find({ 
      where: { tenantId, isActive: true }, 
      relations: ['category'],
      order: { createdAt: 'DESC' } 
    });
  }

  async findOneByBarcode(tenantId: string, barcode: string): Promise<Product> {
    const product = await this.productsRepository.findOne({ where: { tenantId, barcode, isActive: true } });
    if (!product) {
      throw new NotFoundException(`Producto con código de barras ${barcode} no encontrado.`);
    }
    return product;
  }

  async update(tenantId: string, id: string, updateProductDto: UpdateProductDto): Promise<Product> {
    const product = await this.productsRepository.findOne({ where: { id, tenantId } });
    if (!product) {
      throw new NotFoundException(`Producto no encontrado.`);
    }

    if (updateProductDto.barcode && updateProductDto.barcode !== product.barcode) {
      const existing = await this.productsRepository.findOne({ where: { tenantId, barcode: updateProductDto.barcode } });
      if (existing) {
        throw new ConflictException('Ya existe otro producto con este código de barras');
      }
    }

    Object.assign(product, updateProductDto);
    return this.productsRepository.save(product);
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const product = await this.productsRepository.findOne({ where: { id, tenantId } });
    if (!product) {
      throw new NotFoundException(`Producto no encontrado.`);
    }
    await this.productsRepository.remove(product);
  }

  async updateStock(tenantId: string, id: string, quantityToSubtract: number, manager?: EntityManager): Promise<void> {
    const repo = manager ? manager.getRepository(Product) : this.productsRepository;
    const product = await repo.findOne({ where: { id, tenantId } });
    if (product) {
      // Permitimos stock negativo temporalmente para que no bloquee ventas urgentes,
      // pero actualizamos en BD.
      product.stock -= quantityToSubtract;
      await repo.save(product);
    }
  }

  async createMany(tenantId: string, productsDto: CreateProductDto[]): Promise<Product[]> {
    try {
      const products = productsDto.map(dto => this.productsRepository.create({
        ...dto,
        tenantId,
      }));
      return await this.productsRepository.save(products);
    } catch (error) {
      // Manejar error de duplicado (Postgres 23505)
      if (error.code === '23505') {
        throw new ConflictException('Uno o más productos ya existen (posible código de barras duplicado)');
      }
      throw error;
    }
  }
}
