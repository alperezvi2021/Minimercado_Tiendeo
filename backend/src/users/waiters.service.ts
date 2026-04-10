import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class WaitersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async findAll(tenantId: string): Promise<User[]> {
    return this.usersRepository.find({
      where: { 
        tenantId, 
        role: 'WAITER' 
      },
      select: ['id', 'name', 'role', 'pin'],
    });
  }

  async create(tenantId: string, name: string, pin: string): Promise<User> {
    if (!pin || pin.length !== 4) {
      throw new BadRequestException('El PIN debe tener exactamente 4 dígitos');
    }

    // Generar un email único ficticio para el mesero
    const dummyEmail = `waiter_${Date.now()}_${Math.floor(Math.random() * 1000)}@tiendeo.internal`;

    const waiter = this.usersRepository.create({
      tenantId,
      name,
      email: dummyEmail,
      passwordHash: 'WAITERS_DONT_USE_PASSWORD', // Contraseña inerte
      role: 'WAITER',
      pin,
    });

    return this.usersRepository.save(waiter);
  }

  async updatePin(tenantId: string, waiterId: string, pin: string): Promise<User> {
    const waiter = await this.usersRepository.findOne({
      where: { id: waiterId, tenantId, role: 'WAITER' }
    });

    if (!waiter) throw new NotFoundException('Mesero no encontrado');
    if (pin.length !== 4) throw new BadRequestException('El PIN debe tener 4 dígitos');

    waiter.pin = pin;
    return this.usersRepository.save(waiter);
  }

  async update(tenantId: string, id: string, dto: { name?: string, pin?: string }): Promise<User> {
    const waiter = await this.usersRepository.findOne({
      where: { id, tenantId, role: 'WAITER' }
    });

    if (!waiter) throw new NotFoundException('Mesero no encontrado');

    if (dto.name) waiter.name = dto.name;
    if (dto.pin) {
      if (dto.pin.length !== 4) throw new BadRequestException('El PIN debe tener 4 dígitos');
      waiter.pin = dto.pin;
    }

    return this.usersRepository.save(waiter);
  }

  async delete(tenantId: string, waiterId: string): Promise<void> {
    const result = await this.usersRepository.delete({ id: waiterId, tenantId, role: 'WAITER' });
    if (result.affected === 0) throw new NotFoundException('Mesero no encontrado');
  }

  async validatePin(tenantId: string, pin: string): Promise<User> {
    const waiter = await this.usersRepository.findOne({
      where: { tenantId, pin, role: 'WAITER' },
      select: ['id', 'name', 'role']
    });

    if (!waiter) {
      throw new BadRequestException('PIN inválido o mesero no activo');
    }

    return waiter;
  }
}
