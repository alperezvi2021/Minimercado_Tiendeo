import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entities/category.entity';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private categoriesRepository: Repository<Category>,
  ) {}

  async create(createCategoryDto: any, tenantId: string): Promise<Category> {
    const category = this.categoriesRepository.create({
      ...createCategoryDto,
      tenantId,
    });
    return (await this.categoriesRepository.save(category)) as any;
  }

  async findAll(tenantId: string): Promise<Category[]> {
    return this.categoriesRepository.find({
      where: { tenantId },
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string, tenantId: string): Promise<Category> {
    const category = await this.categoriesRepository.findOne({
      where: { id, tenantId },
    });
    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }
    return category;
  }

  async update(id: string, updateCategoryDto: any, tenantId: string): Promise<Category> {
    const category = await this.findOne(id, tenantId);
    Object.assign(category, updateCategoryDto);
    return (await this.categoriesRepository.save(category)) as any;
  }

  async remove(id: string, tenantId: string): Promise<void> {
    const category = await this.findOne(id, tenantId);
    await this.categoriesRepository.remove(category);
  }
}
