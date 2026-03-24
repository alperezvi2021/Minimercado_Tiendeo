import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
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
      relations: ['supplier', 'items'],
      order: { date: 'DESC' },
    });
  }

  async findOneInvoice(tenantId: string, id: string) {
    return this.invoicesRepo.findOne({
      where: { id, tenantId },
      relations: ['supplier', 'items'],
    });
  }

  async findOneSupplier(tenantId: string, id: string) {
    const supplier = await this.suppliersRepo.findOne({ where: { id, tenantId } });
    if (!supplier) throw new NotFoundException('Supplier not found');
    return supplier;
  }

  async updateSupplier(tenantId: string, id: string, data: any) {
    await this.findOneSupplier(tenantId, id);
    await this.suppliersRepo.update(id, data);
    return this.findOneSupplier(tenantId, id);
  }

  async removeSupplier(tenantId: string, id: string) {
    const supplier = await this.findOneSupplier(tenantId, id);
    // Verificar si tiene facturas asociadas
    const invoicesCount = await this.invoicesRepo.count({ where: { supplier: { id } } });
    if (invoicesCount > 0) {
      throw new ConflictException('No se puede eliminar el proveedor porque tiene facturas registradas.');
    }
    return this.suppliersRepo.remove(supplier);
  }

  async updateInvoice(tenantId: string, id: string, data: any) {
    const { items, ...invoiceData } = data;
    
    // Verificar existencia
    const invoice = await this.invoicesRepo.findOne({ where: { id, tenantId } });
    if (!invoice) throw new NotFoundException('Invoice not found');

    // Actualizar cabecera
    await this.invoicesRepo.update(id, {
      ...invoiceData,
      date: new Date(invoiceData.date),
    });

    // Sincronizar ítems: Borrar actuales y crear nuevos
    await this.itemsRepo.delete({ invoiceId: id });
    
    if (items && items.length > 0) {
      const invoiceItems = items.map((item: any) => ({
        ...item,
        invoiceId: id,
        tenantId,
      }));
      await this.itemsRepo.save(invoiceItems);
    }

    return this.findOneInvoice(tenantId, id);
  }

  async removeInvoice(tenantId: string, id: string) {
    const invoice = await this.invoicesRepo.findOne({ where: { id, tenantId } });
    if (!invoice) throw new NotFoundException('Invoice not found');
    
    // Primero borrar ítems ( cascade: true en la entidad debería funcionar, pero por seguridad lo hacemos manual)
    await this.itemsRepo.delete({ invoiceId: id });
    return this.invoicesRepo.remove(invoice);
  }
}
