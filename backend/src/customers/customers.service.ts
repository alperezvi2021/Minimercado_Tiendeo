import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from './entities/customer.entity';
import { SalesService } from '../sales/sales.service';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private customersRepository: Repository<Customer>,
    private salesService: SalesService,
  ) {}

  async create(tenantId: string, userId: string, userName: string, data: any) {
    const { initialDebt, ...customerData } = data;
    const customer = this.customersRepository.create({ ...customerData, tenantId });
    const savedCustomer = await (this.customersRepository.save(customer) as any);

    if (initialDebt && initialDebt > 0) {
      await this.salesService.createLegacyDebt(tenantId, userId, userName, savedCustomer.id, initialDebt);
    }

    return savedCustomer;
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
      relations: ['creditSales', 'creditSales.sale', 'creditSales.payments'],
      order: {
        creditSales: {
          createdAt: 'DESC'
        }
      }
    });
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  async update(tenantId: string, userId: string, userName: string, id: string, data: any) {
    const { initialDebt, ...customerData } = data;
    await this.findOne(tenantId, id);
    await this.customersRepository.update(id, customerData);

    if (initialDebt && initialDebt > 0) {
      await this.salesService.createLegacyDebt(tenantId, userId, userName, id, initialDebt);
    }
    
    return this.findOne(tenantId, id);
  }

  async remove(tenantId: string, id: string) {
    const customer = await this.findOne(tenantId, id);
    return this.customersRepository.remove(customer);
  }
}
