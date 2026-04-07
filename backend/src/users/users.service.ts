import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    const user = await this.usersRepository.findOne({ 
      where: { email },
      relations: ['tenant']
    });
    
    // Ensure backward compatibility: if tenant exists but modules is null, set defaults
    if (user?.tenant && !user.tenant.modules) {
      user.tenant.modules = ['POS', 'CLOSURE', 'INVENTORY', 'REPORTS', 'SUPPLIERS', 'CUSTOMERS', 'CREDITS', 'REFUNDS', 'ACCOUNTING'];
    }
    
    return user;
  }

  async findOne(id: string, tenantId?: string): Promise<User | null> {
    if (tenantId) {
      return this.usersRepository.findOne({ where: { id, tenantId } });
    }
    return this.usersRepository.findOne({ where: { id } });
  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.find();
  }

  async findAllByTenant(tenantId: string): Promise<User[]> {
    return this.usersRepository.find({ where: { tenantId } });
  }

  async create(userData: Partial<User>): Promise<User> {
    if (userData.passwordHash && !userData.passwordHash.startsWith('$2')) {
      userData.passwordHash = await bcrypt.hash(userData.passwordHash, 10);
    }
    const user = this.usersRepository.create(userData);
    return this.usersRepository.save(user);
  }

  async update(id: string, updateData: Partial<User>, tenantId?: string): Promise<User> {
    const where: any = { id };
    if (tenantId) where.tenantId = tenantId;
    
    const user = await this.usersRepository.findOne({ where });
    if (!user) throw new Error('User not found or access denied');
    
    if (updateData.passwordHash && !updateData.passwordHash.startsWith('$2')) {
      updateData.passwordHash = await bcrypt.hash(updateData.passwordHash, 10);
    }
    
    Object.assign(user, updateData);
    return this.usersRepository.save(user);
  }

  async remove(id: string, tenantId?: string): Promise<void> {
    const where: any = { id };
    if (tenantId) where.tenantId = tenantId;
    
    const user = await this.usersRepository.findOne({ where });
    if (!user) throw new Error('User not found or access denied');
    
    await this.usersRepository.remove(user);
  }
}
