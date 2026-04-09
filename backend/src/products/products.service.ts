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
      // 1. Obtener TODOS los productos (incluyendo inactivos) para evitar violar la clave única de barcode
      const existingProducts = await this.productsRepository.find({
        where: { tenantId },
        select: ['barcode', 'name']
      });

      // 2. Crear sets para búsqueda rápida (normalizados)
      const existingBarcodes = new Set(
        existingProducts
          .map(p => p.barcode?.trim())
          .filter(b => b && b !== '')
      );
      const existingNames = new Set(
        existingProducts.map(p => p.name.toLowerCase().trim())
      );

      const toImport = [];
      let skipped = 0;

      // 3. Filtrar los productos del DTO
      for (const dto of productsDto) {
        const barcode = dto.barcode?.trim();
        const nameNormalized = dto.name?.toLowerCase().trim();

        // Validar integridad de datos básicos
        if (!nameNormalized) {
          skipped++;
          continue;
        }

        const existsByBarcode = barcode && existingBarcodes.has(barcode);
        const existsByName = nameNormalized && existingNames.has(nameNormalized);

        if (existsByBarcode || existsByName) {
          skipped++;
        } else {
          // Asegurar que los números sean válidos y no NaN
          const cleanPrice = isFinite(Number(dto.price)) ? Number(dto.price) : 0;
          const cleanStock = isFinite(Number(dto.stock)) ? Number(dto.stock) : 0;

          toImport.push(this.productsRepository.create({
            ...dto,
            price: cleanPrice,
            stock: cleanStock,
            tenantId,
          }));
          
          // Prevenir duplicados dentro del mismo archivo excel
          if (barcode) existingBarcodes.add(barcode);
          existingNames.add(nameNormalized);
        }
      }

      // 4. Guardar los que no existían (en bloques de 100 para evitar saturación/timeouts)
      const BATCH_SIZE = 100;
      for (let i = 0; i < toImport.length; i += BATCH_SIZE) {
        const batch = toImport.slice(i, i + BATCH_SIZE);
        await this.productsRepository.save(batch);
      }

      return {
        total: productsDto.length,
        imported: toImport.length,
        skipped: skipped
      };
    } catch (error) {
      console.error("CRITICAL_ERROR_BULK_IMPORT:", error);
      throw error;
    }
  }
}
