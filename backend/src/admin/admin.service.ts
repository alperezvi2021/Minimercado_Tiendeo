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
    
    return tenants.map(t => ({
      id: t.id,
      name: t.name,
      userCount: t.users ? t.users.length : 0,
      createdAt: t.createdAt
    }));
  }

  async findAllUsers(): Promise<User[]> {
    return this.usersRepository.find({
      relations: ['tenant'],
    });
  }

  async resetUserPassword(userId: string, newPassword: string): Promise<void> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error('Usuario no encontrado');
    }
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.usersRepository.update(userId, { passwordHash });
  }
}
