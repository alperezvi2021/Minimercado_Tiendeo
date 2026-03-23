import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from './entities/customer.entity';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private customersRepository: Repository<Customer>,
  ) {}

  async create(tenantId: string, data: Partial<Customer>) {
    const customer = this.customersRepository.create({ ...data, tenantId });
    return this.customersRepository.save(customer);
  }

  async findAll(tenantId: string) {
    const customers = await this.customersRepository.find({
      where: { tenantId },
      relations: ['creditSales'],
      order: { name: 'ASC' },
    });

    return customers.map(c => {
      const totalDebt = c.creditSales
        .filter(cs => cs.status !== 'PAID')
        .reduce((sum, cs) => sum + Number(cs.remainingAmount), 0);
      const pendingInvoices = c.creditSales.filter(cs => cs.status !== 'PAID').length;
      
      // Remove creditSales from output to keep it light
      delete (c as any).creditSales;
      
      return {
        ...c,
        totalDebt,
        pendingInvoices,
      };
    });
  }

  async findOne(tenantId: string, id: string) {
    const customer = await this.customersRepository.findOne({
      where: { id, tenantId },
      relations: ['creditSales', 'creditSales.sale'],
    });
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  async update(tenantId: string, id: string, data: Partial<Customer>) {
    await this.findOne(tenantId, id);
    await this.customersRepository.update(id, data);
    return this.findOne(tenantId, id);
  }

  async remove(tenantId: string, id: string) {
    const customer = await this.findOne(tenantId, id);
    return this.customersRepository.remove(customer);
  }
}
