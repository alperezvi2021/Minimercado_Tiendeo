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
    return this.usersRepository.findOne({ where: { email } });
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
}
