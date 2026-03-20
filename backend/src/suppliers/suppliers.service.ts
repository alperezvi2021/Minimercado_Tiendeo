import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Supplier } from './entities/supplier.entity';
import { SupplierInvoice } from './entities/supplier-invoice.entity';
import { InvoiceItem } from './entities/invoice-item.entity';

@Injectable()
export class SuppliersService {
  constructor(
    @InjectRepository(Supplier)
    private suppliersRepo: Repository<Supplier>,
    @InjectRepository(SupplierInvoice)
    private invoicesRepo: Repository<SupplierInvoice>,
    @InjectRepository(InvoiceItem)
    private itemsRepo: Repository<InvoiceItem>,
  ) {}

  async createSupplier(tenantId: string, data: any) {
    const supplier = this.suppliersRepo.create({ ...data, tenantId });
    return this.suppliersRepo.save(supplier);
  }

  async findAllSuppliers(tenantId: string) {
    return this.suppliersRepo.find({ where: { tenantId } });
  }

  async createInvoice(tenantId: string, data: any) {
    const { items, ...invoiceData } = data;
    
    const invoice = this.invoicesRepo.create({
      ...invoiceData,
      tenantId,
      date: new Date(invoiceData.date),
    });

    const savedInvoice = (await this.invoicesRepo.save(invoice)) as unknown as SupplierInvoice;

    if (items && items.length > 0) {
      const invoiceItems = items.map((item: any) => ({
        ...item,
        invoiceId: savedInvoice.id,
        tenantId,
      }));
      await this.itemsRepo.save(invoiceItems);
    }

    return this.findOneInvoice(tenantId, savedInvoice.id);
  }

  async findInvoices(tenantId: string) {
    return this.invoicesRepo.find({
      where: { tenantId },
      relations: ['supplier'],
      order: { date: 'DESC' },
    });
  }

  async findOneInvoice(tenantId: string, id: string) {
    return this.invoicesRepo.findOne({
      where: { id, tenantId },
      relations: ['supplier', 'items'],
    });
  }
}
