import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from './entities/tenant.entity';
import { UpdateTenantDto } from './dto/update-tenant.dto';

@Injectable()
export class TenantsService {
  constructor(
    @InjectRepository(Tenant)
    private tenantsRepository: Repository<Tenant>,
  ) {}

  async create(name: string, modules?: string[]): Promise<Tenant> {
    const defaultModules = [
      'POS',
      'CLOSURE',
      'INVENTORY',
      'REPORTS',
      'SUPPLIERS',
      'CUSTOMERS',
      'CREDITS',
      'REFUNDS',
      'ACCOUNTING',
      'CASHIER_MONITOR',
    ];
    const tenant = this.tenantsRepository.create({
      name,
      modules: modules || defaultModules,
    });
    return this.tenantsRepository.save(tenant);
  }

  async findOne(id: string): Promise<Tenant> {
    const tenant = await this.tenantsRepository.findOne({ where: { id } });
    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${id} not found`);
    }
    return tenant;
  }

  async update(id: string, updateTenantDto: UpdateTenantDto): Promise<Tenant> {
    await this.tenantsRepository.update(id, updateTenantDto);
    return this.findOne(id);
  }
}
