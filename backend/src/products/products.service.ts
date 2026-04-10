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

  async createMany(tenantId: string, productsDto: CreateProductDto[]): Promise<any> {
    try {
      // 1. Obtener TODOS los productos (incluyendo inactivos) del tenant
      const existingProducts = await this.productsRepository.find({
        where: { tenantId }
      });

      // 2. Crear mapas para búsqueda rápida (normalizados)
      const barcodeMap = new Map<string, Product>();
      const nameMap = new Map<string, Product>();

      existingProducts.forEach(p => {
        if (p.barcode && p.barcode.trim() !== '') {
          barcodeMap.set(p.barcode.trim(), p);
        }
        nameMap.set(p.name.toLowerCase().trim(), p);
      });

      const toSave: Product[] = [];
      let imported = 0;
      let updated = 0;

      // 3. Procesar cada producto del DTO
      for (const dto of productsDto) {
        const nameStr = String(dto.name || '').trim();
        const barcode = dto.barcode ? String(dto.barcode).trim() : null;
        const nameNormalized = nameStr.toLowerCase();

        if (!nameNormalized) continue;

        // Intentar encontrar el producto existente por barcode o por nombre
        let product = (barcode && barcodeMap.get(barcode)) || nameMap.get(nameNormalized);

        if (product) {
          // MODO ACTUALIZACIÓN (UPSERT)
          // Actualizamos campos básicos si vienen en el DTO
          product.name = nameStr;
          product.barcode = barcode;
          
          if (dto.price !== undefined) product.price = Number(dto.price);
          if (dto.cost !== undefined) product.cost = dto.cost !== null ? Number(dto.cost) : null;
          if (dto.stock !== undefined) product.stock = Number(dto.stock);
          if (dto.profitMargin !== undefined) product.profitMargin = dto.profitMargin !== null ? Number(dto.profitMargin) : null;
          if (dto.categoryId !== undefined) product.categoryId = dto.categoryId;
          if (dto.lowStockThreshold !== undefined) product.lowStockThreshold = Number(dto.lowStockThreshold);
          
          product.isActive = true; // Si estaba inactivo, lo reactivamos al importar
          
          toSave.push(product);
          updated++;
        } else {
          // MODO CREACIÓN
          const newProduct = this.productsRepository.create({
            ...dto,
            name: nameStr,
            barcode: barcode,
            tenantId,
            price: isFinite(Number(dto.price)) ? Number(dto.price) : 0,
            stock: isFinite(Number(dto.stock)) ? Number(dto.stock) : 0,
          });
          
          toSave.push(newProduct);
          imported++;
          
          // Registrar en los mapas para evitar duplicados dento del mismo archivo Excel
          if (barcode) barcodeMap.set(barcode, newProduct);
          nameMap.set(nameNormalized, newProduct);
        }
      }

      // 4. Guardar en bloques (BATCH_SIZE) para optimización
      const BATCH_SIZE = 100;
      for (let i = 0; i < toSave.length; i += BATCH_SIZE) {
        const batch = toSave.slice(i, i + BATCH_SIZE);
        await this.productsRepository.save(batch);
      }

      return {
        total: productsDto.length,
        imported: imported,
        updated: updated,
        totalProcessed: toSave.length
      };
    } catch (error) {
      console.error("CRITICAL_ERROR_BULK_IMPORT:", error);
      throw error;
    }
  }
}
