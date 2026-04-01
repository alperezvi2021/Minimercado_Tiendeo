import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Sale } from './entities/sale.entity';
import { CreditSale } from './entities/credit-sale.entity';
import { CreditPayment } from './entities/credit-payment.entity';
import { CashClosure } from './entities/cash-closure.entity';
import { CreateSaleDto } from './dto/create-sale.dto';
import { ProductsService } from '../products/products.service';
import { Customer } from '../customers/entities/customer.entity';
import { Refund } from './entities/refund.entity';
import { RefundItem } from './entities/refund-item.entity';
import { CreateRefundDto } from './dto/create-refund.dto';

@Injectable()
export class SalesService {
  constructor(
    @InjectRepository(Sale)
    private salesRepository: Repository<Sale>,
    @InjectRepository(CreditSale)
    private creditSalesRepository: Repository<CreditSale>,
    @InjectRepository(CreditPayment)
    private creditPaymentsRepository: Repository<CreditPayment>,
    @InjectRepository(CashClosure)
    private cashClosureRepository: Repository<CashClosure>,
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
    @InjectRepository(Refund)
    private refundRepository: Repository<Refund>,
    @InjectRepository(RefundItem)
    private refundItemRepository: Repository<RefundItem>,
    private productsService: ProductsService,
    private dataSource: DataSource,
  ) {}

  async getOpenClosure(tenantId: string, userId: string): Promise<CashClosure> {
    return await this.cashClosureRepository.findOne({
      where: { tenantId, userId, status: 'OPEN' },
    });
  }

  async openClosure(tenantId: string, userId: string, userName: string, openingAmount: number): Promise<CashClosure> {
    const existing = await this.getOpenClosure(tenantId, userId);
    if (existing) throw new BadRequestException('Ya existe un turno abierto para este usuario');

    const closure = this.cashClosureRepository.create({
      tenantId,
      userId,
      userName,
      openingAmount,
      status: 'OPEN',
    });

    return await this.cashClosureRepository.save(closure);
  }

  async create(tenantId: string, userId: string, userName: string, createSaleDto: CreateSaleDto): Promise<Sale> {
    if (!createSaleDto.items || createSaleDto.items.length === 0) {
      throw new BadRequestException('El ticket no puede estar vacío');
    }

    const closure = await this.getOpenClosure(tenantId, userId);
    if (!closure) throw new BadRequestException('Debe realizar la apertura de caja primero');

    return await this.dataSource.transaction(async transactionalEntityManager => {
      // Logic for invoice number
      const lastSale = await transactionalEntityManager.findOne(Sale, {
        where: { tenantId },
        order: { createdAt: 'DESC' },
        select: ['invoiceNumber']
      });

      let nextNumber = 1;
      if (lastSale && lastSale.invoiceNumber) {
        const parts = lastSale.invoiceNumber.split('-');
        if (parts.length > 1) {
          const lastNum = parseInt(parts[1]);
          if (!isNaN(lastNum)) nextNumber = lastNum + 1;
        }
      }
      const invoiceNumber = `POS-${nextNumber.toString().padStart(4, '0')}`;

      const sale = transactionalEntityManager.create(Sale, {
        tenantId,
        userId,
        sellerName: userName,
        closureId: closure.id,
        totalAmount: createSaleDto.totalAmount,
        paymentMethod: createSaleDto.paymentMethod || 'efectivo',
        invoiceNumber,
        customerName: createSaleDto.customerName, // FIX: Save customer name to Sale entity
        items: createSaleDto.items.map(item => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: item.subtotal,
        })),
      });

      const savedSale = await transactionalEntityManager.save<Sale>(sale);

      // Si es crédito, crear la entrada en la tabla de créditos inmediatamente
      if (createSaleDto.paymentMethod === 'credito') {
        const creditSale = transactionalEntityManager.create(CreditSale, {
          tenantId,
          saleId: savedSale.id,
          customerName: createSaleDto.customerName || 'Cliente Genérico',
          customerId: createSaleDto.customerId, // Link to customer if provided
          amount: savedSale.totalAmount,
          remainingAmount: savedSale.totalAmount, // Initially full amount
          status: 'PENDING',
        });
        await transactionalEntityManager.save<CreditSale>(creditSale);
      }

      // Descontar inventario
      for (const item of createSaleDto.items) {
        await this.productsService.updateStock(tenantId, item.productId, item.quantity);
      }

      return savedSale;
    });
  }

  async findAll(tenantId: string): Promise<Sale[]> {
    return this.salesRepository.find({
      where: { tenantId },
      relations: ['items', 'user'],
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
    const closure = await this.getOpenClosure(tenantId, userId);

    if (!closure) return null;

    const sales = await this.salesRepository.find({
      where: { tenantId, closureId: closure.id },
    });

    const cashSales = sales.filter(s => s.paymentMethod === 'efectivo' || s.paymentMethod === 'tarjeta');
    const creditSales = sales.filter(s => s.paymentMethod === 'credito');

    const totalCash = cashSales.reduce((sum, s) => sum + Number(s.totalAmount), 0);
    const totalCredit = creditSales.reduce((sum, s) => sum + Number(s.totalAmount), 0);
    const totalPayments = Number(closure.totalCreditPayments || 0);
    const openingAmount = Number(closure.openingAmount || 0);

    // El efectivo que DEBE haber en caja es: Base + Ventas Efectivo + Abonos de créditos
    const totalToDeliver = openingAmount + totalCash + totalPayments;

    return {
      closure,
      openingAmount,
      totalCash,
      totalCredit,
      totalPayments,
      totalToDeliver,
      salesCount: sales.length,
    };
  }

  async performClosure(tenantId: string, userId: string): Promise<CashClosure> {
    const status = await this.getCurrentClosureStatus(tenantId, userId);
    if (!status) throw new BadRequestException('No hay turno abierto para cerrar');

    const closure = status.closure;
    closure.totalCashSales = status.totalCash;
    closure.totalCreditSales = status.totalCredit;
    closure.totalCreditPayments = status.totalPayments;
    // totalAmount en la entidad será el total recolectado en efectivo (incluyendo base)
    closure.totalAmount = status.totalToDeliver; 
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
      where: [
        { tenantId, status: 'PENDING' },
        { tenantId, status: 'PARTIAL' }
      ],
      relations: ['sale'],
      order: { createdAt: 'DESC' },
    });
  }

  async findAllPayments(tenantId: string): Promise<CreditPayment[]> {
    return this.creditPaymentsRepository.find({
      where: { tenantId },
      order: { paymentDate: 'DESC' },
    });
  }

  async payCreditSale(tenantId: string, creditId: string, userId: string, userName: string): Promise<CreditSale> {
    const creditSale = await this.creditSalesRepository.findOne({
      where: { id: creditId, tenantId },
      relations: ['sale'],
    });

    if (!creditSale) throw new NotFoundException('Crédito no encontrado');
    if (creditSale.status === 'PAID') throw new BadRequestException('Este crédito ya ha sido pagado');

    creditSale.status = 'PAID';
    creditSale.remainingAmount = 0;
    creditSale.paidAt = new Date();
    
    // Si queremos que el pago completo también se registre como un abono histórico:
    const payment = this.creditPaymentsRepository.create({
      tenantId,
      creditSaleId: creditSale.id,
      amount: creditSale.amount, // En este caso es el total si se paga de una
      paymentDate: new Date(),
      paymentMethod: 'efectivo',
      notes: 'Pago total directo',
    });
    await this.creditPaymentsRepository.save(payment);

    // Registrar en el cierre de caja actual
    const closure = await this.getOpenClosure(tenantId, userId);
    if (closure) {
      closure.totalCreditPayments = Number(closure.totalCreditPayments) + Number(creditSale.amount);
      await this.cashClosureRepository.save(closure);
    }

    if (creditSale.sale) {
      creditSale.sale.paymentMethod = 'efectivo';
      await this.salesRepository.save(creditSale.sale);
    }

    return this.creditSalesRepository.save(creditSale);
  }

  async registerPartialPayment(tenantId: string, creditId: string, amount: number, userId: string, userName: string, notes?: string): Promise<CreditPayment> {
    const creditSale = await this.creditSalesRepository.findOne({
      where: { id: creditId, tenantId },
      relations: ['sale'],
    });

    if (!creditSale) throw new NotFoundException('Crédito no encontrado');
    if (creditSale.status === 'PAID') throw new BadRequestException('Este crédito ya está pagado');
    
    const remaining = Number(creditSale.remainingAmount);
    if (amount > remaining) throw new BadRequestException('El abono no puede ser mayor a la deuda pendiente');

    const payment = this.creditPaymentsRepository.create({
      tenantId,
      creditSaleId: creditId,
      amount,
      paymentDate: new Date(),
      paymentMethod: 'efectivo',
      notes,
    });

    await this.creditPaymentsRepository.save(payment);

    // Registrar en el cierre de caja actual
    const closure = await this.getOpenClosure(tenantId, userId);
    if (closure) {
      closure.totalCreditPayments = Number(closure.totalCreditPayments) + Number(amount);
      await this.cashClosureRepository.save(closure);
    }

    // Actualizar saldo de la deuda
    creditSale.remainingAmount = remaining - amount;
    if (creditSale.remainingAmount <= 0) {
      creditSale.status = 'PAID';
      creditSale.paidAt = new Date();
      // Si se completa el pago, la venta original puede marcarse como efectivo para el reporte diario
      if (creditSale.sale) {
        creditSale.sale.paymentMethod = 'efectivo';
        await this.salesRepository.save(creditSale.sale);
      }
    } else {
      creditSale.status = 'PARTIAL';
    }

    await this.creditSalesRepository.save(creditSale);
    return payment;
  }

  async getCreditHistory(tenantId: string, creditId: string): Promise<any> {
    const credit = await this.creditSalesRepository.findOne({
      where: { id: creditId, tenantId },
      relations: ['sale', 'sale.items', 'customer'],
    });
    
    const payments = await this.creditPaymentsRepository.find({
      where: { creditSaleId: creditId, tenantId },
      order: { paymentDate: 'DESC' },
    });

    return { credit, payments };
  }

  async paySale(tenantId: string, saleId: string, userId: string, userName: string): Promise<void> {
    const creditSale = await this.creditSalesRepository.findOne({
      where: { saleId, tenantId },
      relations: ['sale'],
    });

    if (creditSale) {
      await this.payCreditSale(tenantId, creditSale.id, userId, userName);
    } else {
      // Si no hay registro en creditSales (ej: datos antiguos), buscamos la venta
      const sale = await this.salesRepository.findOne({ where: { id: saleId, tenantId } });
      if (sale && sale.paymentMethod === 'credito') {
          sale.paymentMethod = 'efectivo';
          await this.salesRepository.save(sale);
          // Registrar en el cierre de caja actual si se actualiza una venta antigua
          const closure = await this.getOpenClosure(tenantId, userId);
          if (closure) {
            closure.totalCreditPayments = Number(closure.totalCreditPayments) + Number(sale.totalAmount);
            await this.cashClosureRepository.save(closure);
          }
      }
    }
  }

  async syncCredits(tenantId: string): Promise<any> {
    const sales = await this.salesRepository.find({
      where: { tenantId, paymentMethod: 'credito' }
    });

    let creditCreated = 0;
    let customerCreated = 0;
    let linked = 0;

    for (const sale of sales) {
      // 1. Asegurar que exista el CreditSale
      let creditSale = await this.creditSalesRepository.findOne({
        where: { saleId: sale.id, tenantId }
      });

      if (!creditSale) {
        creditSale = this.creditSalesRepository.create({
          tenantId,
          saleId: sale.id,
          customerName: sale.customerName || 'Cliente Recuperado',
          amount: sale.totalAmount,
          remainingAmount: sale.totalAmount,
          status: 'PENDING',
          createdAt: sale.createdAt
        });
        await this.creditSalesRepository.save(creditSale);
        creditCreated++;
      }

      // 2. Sincronizar con Entidad Customer
      if (creditSale.customerName && !creditSale.customerId) {
        // Buscar cliente por nombre (insensible a mayúsculas/minúsculas)
        let customer = await this.customerRepository.createQueryBuilder('customer')
          .where('LOWER(customer.name) = LOWER(:name)', { name: creditSale.customerName })
          .andWhere('customer.tenantId = :tenantId', { tenantId })
          .getOne();

        if (!customer) {
          const newCustomer = this.customerRepository.create({
            tenantId,
            name: creditSale.customerName,
          });
          customer = await this.customerRepository.save(newCustomer);
          customerCreated++;
        }

        // Vincular
        if (customer) {
          creditSale.customerId = customer.id;
          await this.creditSalesRepository.save(creditSale);
          linked++;
        }
      }
    }

    return { 
      creditCreated, 
      customerCreated, 
      linked,
      totalSales: sales.length 
    };
  }

  async createRefund(tenantId: string, userId: string, userName: string, dto: CreateRefundDto): Promise<Refund> {
    const sale = await this.salesRepository.findOne({
      where: { id: dto.saleId, tenantId },
      relations: ['items'],
    });

    if (!sale) throw new NotFoundException('Venta original no encontrada');

    const closure = await this.getOpenClosure(tenantId, userId);
    if (!closure) throw new BadRequestException('Debe abrir la caja primero');

    return await this.dataSource.transaction(async transactionalEntityManager => {
      const refund = transactionalEntityManager.create(Refund, {
        tenantId,
        saleId: dto.saleId,
        userId,
        totalAmount: dto.totalAmount,
        reason: dto.reason,
        items: dto.items.map(item => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: item.subtotal,
          returnsToInventory: item.returnsToInventory ?? true,
        })),
      });

      const savedRefund = await transactionalEntityManager.save<Refund>(refund);

      // Ajustar inventario y caja
      for (const item of dto.items) {
        if (item.returnsToInventory !== false) {
          // Usamos valor negativo para SUMAR al stock (0.5 -> -0.5 => stock - (-0.5) = stock + 0.5)
          await this.productsService.updateStock(tenantId, item.productId, -item.quantity);
        }
      }

      // Si la venta original fue en efectivo, restamos del cierre de caja actual
      if (sale.paymentMethod === 'efectivo') {
        closure.totalCashSales = Number(closure.totalCashSales) - Number(dto.totalAmount);
        await transactionalEntityManager.save<CashClosure>(closure);
      } else if (sale.paymentMethod === 'credito') {
        // Si fue crédito, buscamos el registro de crédito para ajustar el saldo
        const creditSale = await transactionalEntityManager.findOne(CreditSale, {
          where: { saleId: sale.id, tenantId }
        });
        if (creditSale) {
          creditSale.remainingAmount = Number(creditSale.remainingAmount) - Number(dto.totalAmount);
          if (creditSale.remainingAmount <= 0) {
            creditSale.remainingAmount = 0;
            creditSale.status = 'PAID';
            creditSale.paidAt = new Date();
          }
          await transactionalEntityManager.save<CreditSale>(creditSale);
        }
      }

      return savedRefund;
    });
  }

  async findAllRefunds(tenantId: string): Promise<Refund[]> {
    return this.refundRepository.find({
      where: { tenantId },
      relations: ['items'],
      order: { createdAt: 'DESC' },
    });
  }

  async createLegacyDebt(tenantId: string, userId: string, userName: string, customerId: string, amount: number): Promise<CreditSale> {
    const closure = await this.getOpenClosure(tenantId, userId);
    if (!closure) throw new BadRequestException('Debe abrir la caja primero');
    const customer = await this.customerRepository.findOne({ where: { id: customerId, tenantId } });
    
    if (!customer) throw new NotFoundException('Cliente no encontrado');

    return await this.dataSource.transaction(async transactionalEntityManager => {
      // 1. Crear una venta ficticia de "SALDO INICIAL"
      const sale = transactionalEntityManager.create(Sale, {
        tenantId,
        userId,
        sellerName: userName,
        closureId: closure.id,
        totalAmount: amount,
        paymentMethod: 'credito',
        invoiceNumber: `LEGACY-${Date.now().toString().slice(-6)}`,
        customerName: customer.name,
        items: [], // Sin items específicos, solo el total
      });

      const savedSale = await transactionalEntityManager.save<Sale>(sale);

      // 2. Crear el registro de crédito
      const creditSale = transactionalEntityManager.create(CreditSale, {
        tenantId,
        saleId: savedSale.id,
        customerName: customer.name,
        customerId: customer.id,
        amount: savedSale.totalAmount,
        remainingAmount: savedSale.totalAmount,
        status: 'PENDING',
      });

      return transactionalEntityManager.save<CreditSale>(creditSale);
    });
  }
}
