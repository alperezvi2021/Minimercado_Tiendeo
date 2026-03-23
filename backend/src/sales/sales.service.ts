import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Sale } from './entities/sale.entity';
import { CreditSale } from './entities/credit-sale.entity';
import { CashClosure } from './entities/cash-closure.entity';
import { CreateSaleDto } from './dto/create-sale.dto';
import { ProductsService } from '../products/products.service';

@Injectable()
export class SalesService {
  constructor(
    @InjectRepository(Sale)
    private salesRepository: Repository<Sale>,
    @InjectRepository(CreditSale)
    private creditSalesRepository: Repository<CreditSale>,
    @InjectRepository(CashClosure)
    private cashClosureRepository: Repository<CashClosure>,
    private productsService: ProductsService,
  ) {}

  async getOrCreateOpenClosure(tenantId: string, userId: string, userName: string): Promise<CashClosure> {
    let closure = await this.cashClosureRepository.findOne({
      where: { tenantId, userId, status: 'OPEN' },
    });

    if (!closure) {
      closure = this.cashClosureRepository.create({
        tenantId,
        userId,
        userName,
        status: 'OPEN',
      });
      closure = await this.cashClosureRepository.save(closure);
    }

    return closure;
  }

  async create(tenantId: string, userId: string, userName: string, createSaleDto: CreateSaleDto): Promise<Sale> {
    if (!createSaleDto.items || createSaleDto.items.length === 0) {
      throw new BadRequestException('El ticket no puede estar vacío');
    }

    const closure = await this.getOrCreateOpenClosure(tenantId, userId, userName);

    const sale = this.salesRepository.create({
      tenantId,
      userId,
      closureId: closure.id,
      totalAmount: createSaleDto.totalAmount,
      paymentMethod: createSaleDto.paymentMethod || 'efectivo',
      items: createSaleDto.items.map(item => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: item.subtotal,
      })),
    });

    const savedSale = await this.salesRepository.save(sale);

    // Descontar inventario
    for (const item of createSaleDto.items) {
      await this.productsService.updateStock(tenantId, item.productId, item.quantity);
    }

    return savedSale;
  }

  async findAll(tenantId: string): Promise<Sale[]> {
    return this.salesRepository.find({
      where: { tenantId },
      relations: ['items'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByClosure(tenantId: string, closureId: string): Promise<Sale[]> {
    return this.salesRepository.find({
      where: { tenantId, closureId },
      relations: ['items'],
      order: { createdAt: 'ASC' },
    });
  }

  async markAsCredit(tenantId: string, saleId: string, customerName: string): Promise<CreditSale> {
    const sale = await this.salesRepository.findOne({
      where: { id: saleId, tenantId },
    });

    if (!sale) throw new NotFoundException('Venta no encontrada');

    sale.paymentMethod = 'credito';
    sale.customerName = customerName;
    await this.salesRepository.save(sale);

    const creditSale = this.creditSalesRepository.create({
      tenantId,
      saleId: sale.id,
      customerName,
      amount: sale.totalAmount,
      status: 'PENDING',
    });

    return this.creditSalesRepository.save(creditSale);
  }

  async getCurrentClosureStatus(tenantId: string, userId: string): Promise<any> {
    const closure = await this.cashClosureRepository.findOne({
      where: { tenantId, userId, status: 'OPEN' },
    });

    if (!closure) return null;

    const sales = await this.salesRepository.find({
      where: { tenantId, closureId: closure.id },
    });

    const cashSales = sales.filter(s => s.paymentMethod === 'efectivo' || s.paymentMethod === 'tarjeta');
    const creditSales = sales.filter(s => s.paymentMethod === 'credito');

    const totalCash = cashSales.reduce((sum, s) => sum + Number(s.totalAmount), 0);
    const totalCredit = creditSales.reduce((sum, s) => sum + Number(s.totalAmount), 0);

    return {
      closure,
      totalCash,
      totalCredit,
      salesCount: sales.length,
    };
  }

  async performClosure(tenantId: string, userId: string): Promise<CashClosure> {
    const status = await this.getCurrentClosureStatus(tenantId, userId);
    if (!status) throw new BadRequestException('No hay turno abierto para cerrar');

    const closure = status.closure;
    closure.totalCashSales = status.totalCash;
    closure.totalCreditSales = status.totalCredit;
    closure.totalAmount = status.totalCash + status.totalCredit;
    closure.closedAt = new Date();
    closure.status = 'CLOSED';

    return this.cashClosureRepository.save(closure);
  }

  async findOne(tenantId: string, id: string): Promise<Sale> {
    const sale = await this.salesRepository.findOne({
      where: { id, tenantId },
      relations: ['items'],
    });
    if (!sale) throw new NotFoundException('Venta no encontrada');
    return sale;
  }

  async findAllPendingCredits(tenantId: string): Promise<CreditSale[]> {
    return this.creditSalesRepository.find({
      where: { tenantId, status: 'PENDING' },
      relations: ['sale'],
      order: { createdAt: 'DESC' },
    });
  }

  async payCreditSale(tenantId: string, creditId: string): Promise<CreditSale> {
    const creditSale = await this.creditSalesRepository.findOne({
      where: { id: creditId, tenantId },
      relations: ['sale'],
    });

    if (!creditSale) throw new NotFoundException('Crédito no encontrado');
    if (creditSale.status === 'PAID') throw new BadRequestException('Este crédito ya ha sido pagado');

    creditSale.status = 'PAID';
    creditSale.paidAt = new Date();
    
    // También actualizamos el método de pago de la venta original para que aparezca en el flujo de caja
    // aunque mantengamos el registro de que nació como crédito.
    if (creditSale.sale) {
      creditSale.sale.paymentMethod = 'efectivo';
      await this.salesRepository.save(creditSale.sale);
    }

    return this.creditSalesRepository.save(creditSale);
  }
}
