import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from './entities/customer.entity';
import { CreditSale } from '../sales/entities/credit-sale.entity';
import { SalesService } from '../sales/sales.service';
import { Role } from '../auth/enums/role.enum';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private customersRepository: Repository<Customer>,
    @InjectRepository(CreditSale)
    private creditSalesRepository: Repository<CreditSale>,
    private salesService: SalesService,
  ) {}

  async create(tenantId: string, userId: string, userName: string, data: any) {
    const { initialDebt, ...customerData } = data;
    const customer = this.customersRepository.create({
      ...customerData,
      tenantId,
    });
    const savedCustomer = await (this.customersRepository.save(
      customer,
    ) as any);

    if (initialDebt && initialDebt > 0) {
      await this.salesService.createLegacyDebt(
        tenantId,
        userId,
        userName,
        savedCustomer.id,
        initialDebt,
        data.description,
      );
    }

    return savedCustomer;
  }

  async findAll(tenantId: string, full = false, userRole?: string) {
    const where: any = {};
    if (userRole !== Role.SUPER_ADMIN && userRole !== Role.ADMIN) {
      where.tenantId = tenantId;
    }

    const customers = await this.customersRepository.find({
      where,
      relations: full
        ? ['creditSales', 'creditSales.sale', 'creditSales.payments']
        : ['creditSales'],
      order: { name: 'ASC' },
    });

    return customers.map((c) => {
      const totalDebt = c.creditSales
        .filter((cs) => cs.status !== 'PAID')
        .reduce((sum, cs) => sum + Number(cs.remainingAmount), 0);
      const pendingInvoices = c.creditSales.filter(
        (cs) => cs.status !== 'PAID',
      ).length;

      // Remove creditSales from output to keep it light if not requested full
      if (!full) {
        delete (c as any).creditSales;
      }

      return {
        ...c,
        totalDebt,
        pendingInvoices,
      };
    });
  }

  async findOne(tenantId: string, id: string, userRole?: string) {
    const where: any = { id };
    // Los administradores globales pueden ver cualquier cliente
    if (userRole !== Role.SUPER_ADMIN && userRole !== Role.ADMIN) {
      where.tenantId = tenantId;
    }

    const customer = await this.customersRepository.findOne({
      where,
      relations: ['creditSales', 'creditSales.sale', 'creditSales.payments'],
      order: {
        creditSales: {
          createdAt: 'DESC',
        },
      },
    });
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  async update(
    tenantId: string,
    userId: string,
    userName: string,
    id: string,
    data: any,
    userRole?: string,
  ) {
    const { initialDebt, description, ...customerData } = data;
    await this.findOne(tenantId, id, userRole);
    await this.customersRepository.update(id, customerData);

    if (initialDebt && initialDebt > 0) {
      await this.salesService.createLegacyDebt(
        tenantId,
        userId,
        userName,
        id,
        initialDebt,
        description,
      );
    }

    return this.findOne(tenantId, id, userRole);
  }

  async remove(tenantId: string, id: string, userRole?: string) {
    const customer = await this.findOne(tenantId, id, userRole);

    // Eliminar relaciones manualmente para asegurar que el botón de la UI funcione siempre
    await this.creditSalesRepository.delete({ customerId: id });

    return this.customersRepository.remove(customer);
  }
}
