import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from '../tenants/entities/tenant.entity';
import { User } from '../users/entities/user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Tenant)
    private tenantsRepository: Repository<Tenant>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async findAllTenants(): Promise<any[]> {
    // Get all tenants with a count of their users
    const tenants = await this.tenantsRepository.find({
      relations: ['users'],
    });

    return tenants.map((t) => ({
      id: t.id,
      name: t.name,
      activePlan: t.activePlan,
      isActive: t.isActive !== false,
      modules: t.modules || [
        'POS',
        'CLOSURE',
        'INVENTORY',
        'REPORTS',
        'SUPPLIERS',
        'CUSTOMERS',
        'CREDITS',
        'REFUNDS',
        'ACCOUNTING',
      ],
      userCount: t.users ? t.users.length : 0,
      createdAt: t.createdAt,
    }));
  }

  async findAllUsers(): Promise<User[]> {
    return this.usersRepository.find({
      relations: ['tenant'],
      select: ['id', 'name', 'email', 'role', 'modules', 'createdAt'],
    });
  }

  async deleteUser(userId: string): Promise<void> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error('Usuario no encontrado');
    }
    await this.usersRepository.delete(userId);
  }

  async updateUserModules(userId: string, modules: string[]): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error('Usuario no encontrado');
    }
    await this.usersRepository.update(userId, { modules });
    return this.usersRepository.findOne({ where: { id: userId }, relations: ['tenant'] });
  }

  async resetUserPassword(userId: string, newPassword: string): Promise<void> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error('Usuario no encontrado');
    }
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.usersRepository.update(userId, { passwordHash });
  }

  async updateTenantModules(
    tenantId: string,
    modules: string[],
  ): Promise<Tenant> {
    await this.tenantsRepository.update(tenantId, { modules });
    return this.tenantsRepository.findOne({ where: { id: tenantId } });
  }

  async updateTenantStatus(
    tenantId: string,
    isActive: boolean,
  ): Promise<Tenant> {
    await this.tenantsRepository.update(tenantId, { isActive });
    return this.tenantsRepository.findOne({ where: { id: tenantId } });
  }
}
