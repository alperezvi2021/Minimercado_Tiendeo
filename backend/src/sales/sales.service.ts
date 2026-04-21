import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
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
import { SaleItem } from './entities/sale-item.entity';

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

  async getOpenClosure(
    tenantId: string,
    userId?: string,
  ): Promise<CashClosure> {
    const where: any = { tenantId, status: 'OPEN' };
    if (userId) where.userId = userId;

    return await this.cashClosureRepository.findOne({
      where,
      order: { openedAt: 'DESC' },
    });
  }

  async openClosure(
    tenantId: string,
    userId: string,
    userName: string,
    openingAmount: number,
  ): Promise<CashClosure> {
    const existing = await this.getOpenClosure(tenantId, userId);
    if (existing)
      throw new BadRequestException(
        'Ya existe un turno abierto para este usuario',
      );

    const closure = this.cashClosureRepository.create({
      tenantId,
      userId,
      userName,
      openingAmount,
      status: 'OPEN',
    });

    return await this.cashClosureRepository.save(closure);
  }

  private async generateNextInvoiceNumber(
    tenantId: string,
    transactionalEntityManager: any,
  ): Promise<string> {
    const lastSale = await transactionalEntityManager
      .createQueryBuilder(Sale, 'sale')
      .setLock('pessimistic_write')
      .where('sale.tenantId = :tenantId', { tenantId })
      .andWhere('sale.invoiceNumber LIKE :prefix', { prefix: 'POS-%' })
      .orderBy('sale.invoiceNumber', 'DESC')
      .getOne();

    let nextNumber = 1;
    if (lastSale && lastSale.invoiceNumber) {
      const parts = lastSale.invoiceNumber.split('-');
      if (parts.length > 1) {
        const lastNum = parseInt(parts[1]);
        if (!isNaN(lastNum)) nextNumber = lastNum + 1;
      }
    }
    return `POS-${nextNumber.toString().padStart(4, '0')}`;
  }

  async create(
    tenantId: string,
    userId: string,
    userName: string,
    createSaleDto: CreateSaleDto,
  ): Promise<Sale> {
    if (!createSaleDto.items || createSaleDto.items.length === 0) {
      throw new BadRequestException('El ticket no puede estar vacío');
    }

    const closure = await this.getOpenClosure(tenantId, userId);
    if (!closure)
      throw new BadRequestException(
        'Debe realizar la apertura de caja primero',
      );

    return await this.dataSource.transaction(
      async (transactionalEntityManager) => {
        const invoiceNumber = await this.generateNextInvoiceNumber(
          tenantId,
          transactionalEntityManager,
        );

        const sale = transactionalEntityManager.create(Sale, {
          tenantId,
          userId,
          sellerName: userName,
          closureId: closure.id,
          totalAmount: createSaleDto.totalAmount,
          paymentMethod: createSaleDto.paymentMethod || 'efectivo',
          invoiceNumber,
          customerName: createSaleDto.customerName,
          items: createSaleDto.items.map((item) => ({
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: item.subtotal,
          })),
        });

        const savedSale = await transactionalEntityManager.save<Sale>(sale);

        if (createSaleDto.paymentMethod === 'credito') {
          const creditSale = transactionalEntityManager.create(CreditSale, {
            tenantId,
            saleId: savedSale.id,
            customerName: createSaleDto.customerName || 'Cliente Genérico',
            customerId: createSaleDto.customerId,
            amount: savedSale.totalAmount,
            remainingAmount: savedSale.totalAmount,
            status: 'PENDING',
          });
          await transactionalEntityManager.save<CreditSale>(creditSale);
        }

        for (const item of createSaleDto.items) {
          await this.productsService.updateStock(
            tenantId,
            item.productId,
            item.quantity,
            transactionalEntityManager,
          );
        }

        return savedSale;
      },
    );
  }

  async findAll(tenantId: string, status?: string): Promise<Sale[]> {
    const where: any = { tenantId };
    if (status) where.status = status;

    return this.salesRepository.find({
      where,
      relations: ['items', 'user', 'waiter'],
      order: { createdAt: 'DESC' },
    });
  }

  async createTableOrder(
    tenantId: string,
    waiterId: string,
    dto: { tableName: string; items?: any[] },
  ): Promise<Sale> {
    const items = dto.items || [];

    return await this.dataSource.transaction(
      async (transactionalEntityManager) => {
        // Calcular total inicial
        const totalAmount = items.reduce(
          (sum, item) => sum + Number(item.unitPrice) * Number(item.quantity),
          0,
        );

        const sale = transactionalEntityManager.create(Sale, {
          tenantId,
          waiterId,
          tableName: dto.tableName,
          status: 'OPEN',
          totalAmount,
          paymentMethod: 'efectivo',
          items: items.map((item) => ({
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: Number(item.unitPrice) * Number(item.quantity),
          })),
        });

        const savedSale = await transactionalEntityManager.save<Sale>(sale);

        // Descontar inventario inmediatamente si hay items
        for (const item of items) {
          await this.productsService.updateStock(
            tenantId,
            item.productId,
            item.quantity,
            transactionalEntityManager,
          );
        }

        return savedSale;
      },
    );
  }

  async addItemsToTable(
    tenantId: string,
    saleId: string,
    newItems: any[],
  ): Promise<Sale> {
    const sale = await this.salesRepository.findOne({
      where: { id: saleId, tenantId, status: 'OPEN' },
      relations: ['items'],
    });

    if (!sale)
      throw new NotFoundException('Mesa no encontrada o ya está cerrada');

    return await this.dataSource.transaction(
      async (transactionalEntityManager) => {
        console.log(
          `[DEBUG] Añadiendo items al pedido ${saleId}. Items actuales: ${sale.items.length}`,
        );

        // 1. Añadir o fusionar los nuevos items
        for (const newItem of newItems) {
          const existingItem = sale.items.find(
            (i) => i.productId === newItem.productId,
          );

          if (existingItem) {
            const oldQty = Number(existingItem.quantity);
            existingItem.quantity = oldQty + Number(newItem.quantity);
            existingItem.subtotal =
              Number(existingItem.unitPrice) * existingItem.quantity;
            console.log(
              `[DEBUG] Fusión: Producto ${existingItem.productName}. Cantidad: ${oldQty} -> ${existingItem.quantity}. Subtotal: ${existingItem.subtotal}`,
            );
            await transactionalEntityManager.save(SaleItem, existingItem);
          } else {
            const subtotal =
              Number(newItem.unitPrice) * Number(newItem.quantity);
            const saleItem = transactionalEntityManager.create(SaleItem, {
              productId: newItem.productId,
              productName: newItem.productName,
              quantity: Number(newItem.quantity),
              unitPrice: Number(newItem.unitPrice),
              subtotal,
            });
            sale.items.push(saleItem);
            console.log(
              `[DEBUG] Nuevo Item: ${newItem.productName}. Qty: ${newItem.quantity}. Subtotal: ${subtotal}`,
            );
          }

          await this.productsService.updateStock(
            tenantId,
            newItem.productId,
            newItem.quantity,
            transactionalEntityManager,
          );
        }

        // 2. Recalcular total garantizado
        sale.totalAmount = sale.items.reduce(
          (sum, item) => sum + Number(item.subtotal),
          0,
        );
        console.log(`[DEBUG] Nuevo Total a Cobrar: ${sale.totalAmount}`);

        await transactionalEntityManager.save(Sale, sale);

        const refreshedSale = await transactionalEntityManager.findOne(Sale, {
          where: { id: sale.id },
          relations: ['items', 'waiter'],
        });
        console.log(
          `[DEBUG] Pedido refrescado. Items devueltos: ${refreshedSale?.items?.length || 0}`,
        );
        return refreshedSale;
      },
    );
  }

  async updateOrderWaiter(
    tenantId: string,
    saleId: string,
    waiterId: string,
  ): Promise<Sale> {
    const sale = await this.salesRepository.findOne({
      where: { id: saleId, tenantId, status: 'OPEN' },
    });

    if (!sale) throw new NotFoundException('Mesa no encontrada');

    sale.waiterId = waiterId;
    return await this.salesRepository.save(sale);
  }

  async removeItemFromTable(
    tenantId: string,
    saleId: string,
    itemId: string,
  ): Promise<Sale> {
    const sale = await this.salesRepository.findOne({
      where: { id: saleId, tenantId, status: 'OPEN' },
      relations: ['items'],
    });

    if (!sale) throw new NotFoundException('Mesa no encontrada');

    const item = await this.dataSource.getRepository(SaleItem).findOne({
      where: { id: itemId, sale: { id: saleId } },
    });

    if (!item) throw new NotFoundException('Producto no encontrado en la mesa');

    return await this.dataSource.transaction(
      async (transactionalEntityManager) => {
        // 1. Devolver stock
        await this.productsService.updateStock(
          tenantId,
          item.productId,
          -item.quantity,
          transactionalEntityManager,
        );

        // 2. Eliminar el item de la colección y de la base de datos
        sale.items = sale.items.filter((i) => i.id !== itemId);
        await transactionalEntityManager.remove(SaleItem, item);

        // 3. Recalcular total garantizado
        sale.totalAmount = sale.items.reduce(
          (sum, it) => sum + Number(it.subtotal),
          0,
        );

        await transactionalEntityManager.save(Sale, sale);

        // 4. Recargar con relaciones para coherencia en el frontend
        return await transactionalEntityManager.findOne(Sale, {
          where: { id: sale.id },
          relations: ['items', 'waiter'],
        });
      },
    );
  }

  async updateItemQuantity(
    tenantId: string,
    saleId: string,
    itemId: string,
    newQuantity: number,
  ): Promise<Sale> {
    const sale = await this.salesRepository.findOne({
      where: { id: saleId, tenantId, status: 'OPEN' },
      relations: ['items'],
    });

    if (!sale) throw new NotFoundException('Mesa no encontrada');

    const item = await this.dataSource.getRepository(SaleItem).findOne({
      where: { id: itemId, sale: { id: saleId } },
    });

    if (!item) throw new NotFoundException('Producto no encontrado en la mesa');

    return await this.dataSource.transaction(
      async (transactionalEntityManager) => {
        const diff = Number(newQuantity) - Number(item.quantity);
        console.log(
          `[DEBUG] Actualizando Qty para ${item.productName}. ${item.quantity} -> ${newQuantity}. Diff: ${diff}`,
        );

        await this.productsService.updateStock(
          tenantId,
          item.productId,
          diff,
          transactionalEntityManager,
        );

        item.quantity = Number(newQuantity);
        item.subtotal = Number(item.unitPrice) * item.quantity;

        // CRITICAL FIX: Actualizar el item dentro de la colección cargada 'sale.items'
        // Si no hacemos esto, al hacer 'save(Sale, sale)', TypeORM hace cascade y sobreescribe
        // nuestro nuevo quantity en BD con el valor viejo (que quedó guardado en sale.items).
        const itemInSale = sale.items.find((i) => i.id === itemId);
        if (itemInSale) {
          itemInSale.quantity = item.quantity;
          itemInSale.subtotal = item.subtotal;
        }

        // Recalcular total usando la colección ya actualizada
        sale.totalAmount = sale.items.reduce(
          (sum, it) => sum + Number(it.subtotal),
          0,
        );
        console.log(
          `[DEBUG] Recalculado Total: ${sale.totalAmount}. Item Subtotal: ${item.subtotal}`,
        );

        // Podemos guardar solo el sale (el cascade actualizará el SaleItem) o ambos
        await transactionalEntityManager.save(Sale, sale);

        const refreshedSale = await transactionalEntityManager.findOne(Sale, {
          where: { id: sale.id },
          relations: ['items', 'waiter'],
        });
        console.log(
          `[DEBUG] Pedido refrescado tras Qty. Items en DB: ${refreshedSale?.items?.length || 0}`,
        );
        return refreshedSale;
      },
    );
  }

  async closeTableOrder(
    tenantId: string,
    userId: string,
    userName: string,
    saleId: string,
    dto: { paymentMethod: string; customerId?: string; customerName?: string },
  ): Promise<Sale> {
    const sale = await this.salesRepository.findOne({
      where: { id: saleId, tenantId, status: 'OPEN' },
      relations: ['items', 'waiter'],
    });

    if (!sale) throw new NotFoundException('Mesa no encontrada o ya cerrada');

    const closure = await this.getOpenClosure(tenantId, userId);
    if (!closure)
      throw new BadRequestException('Debe abrir la caja para procesar el pago');

    return await this.dataSource.transaction(
      async (transactionalEntityManager) => {
        // Asignar número de factura final al momento del pago
        const invoiceNumber = await this.generateNextInvoiceNumber(
          tenantId,
          transactionalEntityManager,
        );

        // Formato solicitado por el usuario: "Cajero (Mesero: Nombre)"
        const waiterName = sale.waiter?.name || 'Varios';
        const sellerDisplayName = `${userName} (Mesero: ${waiterName})`;

        sale.status = 'PAID';
        sale.paymentMethod = dto.paymentMethod;
        sale.invoiceNumber = invoiceNumber;
        sale.userId = userId;
        sale.sellerName = sellerDisplayName;
        sale.customerName = dto.customerName || sale.customerName;
        sale.closureId = closure.id;

        const savedSale = await transactionalEntityManager.save(Sale, sale);

        // Soporte para Ventas a Crédito (Igual que en POS normal)
        if (dto.paymentMethod === 'credito') {
          const creditSale = transactionalEntityManager.create(CreditSale, {
            tenantId,
            saleId: savedSale.id,
            customerName: dto.customerName || 'Cliente Restaurante',
            customerId: dto.customerId,
            amount: savedSale.totalAmount,
            remainingAmount: savedSale.totalAmount,
            status: 'PENDING',
          });
          await transactionalEntityManager.save(CreditSale, creditSale);
        }

        return savedSale;
      },
    );
  }

  async payOrderItem(
    tenantId: string,
    userId: string,
    userName: string,
    saleId: string,
    itemId: string,
    dto: { paymentMethod: string },
  ): Promise<Sale> {
    const originalSale = await this.salesRepository.findOne({
      where: { id: saleId, tenantId, status: 'OPEN' },
      relations: ['items', 'waiter'],
    });

    if (!originalSale) throw new NotFoundException('Pedido no encontrado');

    const itemToPay = originalSale.items.find((i) => i.id === itemId);
    if (!itemToPay)
      throw new NotFoundException('Producto no encontrado en el pedido');

    const closure = await this.getOpenClosure(tenantId, userId);
    if (!closure)
      throw new BadRequestException('Debe abrir la caja para procesar el pago');

    return await this.dataSource.transaction(
      async (transactionalEntityManager) => {
        const invoiceNumber = await this.generateNextInvoiceNumber(
          tenantId,
          transactionalEntityManager,
        );

        const waiterName = originalSale.waiter?.name || 'Varios';
        const sellerDisplayName = `${userName} (Mesero: ${waiterName})`;

        // 1. Crear una nueva venta cerrada para este item
        const newSale = transactionalEntityManager.create(Sale, {
          tenantId,
          userId,
          sellerName: sellerDisplayName,
          closureId: closure.id,
          totalAmount: Number(itemToPay.subtotal),
          paymentMethod: dto.paymentMethod,
          invoiceNumber,
          status: 'PAID',
          tableName: originalSale.tableName,
          items: [
            transactionalEntityManager.create(SaleItem, {
              productId: itemToPay.productId,
              productName: itemToPay.productName,
              quantity: itemToPay.quantity,
              unitPrice: itemToPay.unitPrice,
              subtotal: itemToPay.subtotal,
            }),
          ],
        });

        await transactionalEntityManager.save(Sale, newSale);

        // 2. Eliminar el item del pedido original
        originalSale.items = originalSale.items.filter((i) => i.id !== itemId);
        await transactionalEntityManager.remove(SaleItem, itemToPay);

        // 3. Recalcular total del pedido original
        originalSale.totalAmount = originalSale.items.reduce(
          (sum, it) => sum + Number(it.subtotal),
          0,
        );

        // Si el pedido original quedó vacío, tal vez cerrarlo? El usuario no especificó, así que lo dejamos abierto.

        await transactionalEntityManager.save(Sale, originalSale);

        return await transactionalEntityManager.findOne(Sale, {
          where: { id: originalSale.id },
          relations: ['items', 'waiter'],
        });
      },
    );
  }

  async cancelTableOrder(tenantId: string, saleId: string): Promise<void> {
    const sale = await this.salesRepository.findOne({
      where: { id: saleId, tenantId, status: 'OPEN' },
      relations: ['items'],
    });

    if (!sale) throw new NotFoundException('Mesa no encontrada');

    await this.dataSource.transaction(async (transactionalEntityManager) => {
      // DEVOLVER STOCK (según preferencia usuario)
      for (const item of sale.items) {
        await this.productsService.updateStock(
          tenantId,
          item.productId,
          -item.quantity,
          transactionalEntityManager,
        );
      }

      await transactionalEntityManager.remove(sale);
    });
  }

  async findByClosure(tenantId: string, closureId: string): Promise<Sale[]> {
    return this.salesRepository.find({
      where: { tenantId, closureId },
      relations: ['items'],
      order: { createdAt: 'DESC' }, // Most recent first
    });
  }

  async markAsCredit(
    tenantId: string,
    saleId: string,
    customerName: string,
  ): Promise<CreditSale> {
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

  async getCurrentClosureStatus(
    tenantId: string,
    userId?: string,
  ): Promise<any> {
    const closure = await this.getOpenClosure(tenantId, userId);

    if (!closure) return null;

    const sales = await this.salesRepository.find({
      where: { tenantId, closureId: closure.id },
    });

    const cashSales = sales.filter(
      (s) => s.paymentMethod === 'efectivo' || s.paymentMethod === 'tarjeta',
    );
    const creditSales = sales.filter((s) => s.paymentMethod === 'credito');

    const totalCash = cashSales.reduce(
      (sum, s) => sum + Number(s.totalAmount),
      0,
    );
    const totalCredit = creditSales.reduce(
      (sum, s) => sum + Number(s.totalAmount),
      0,
    );
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
    if (!status)
      throw new BadRequestException('No hay turno abierto para cerrar');

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
      relations: ['items', 'waiter'],
    });
    if (!sale) throw new NotFoundException('Venta no encontrada');
    return sale;
  }

  async findAllPendingCredits(tenantId: string): Promise<CreditSale[]> {
    return this.creditSalesRepository.find({
      where: [
        { tenantId, status: 'PENDING' },
        { tenantId, status: 'PARTIAL' },
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

  async payCreditSale(
    tenantId: string,
    creditId: string,
    userId: string,
    userName: string,
  ): Promise<CreditSale> {
    const creditSale = await this.creditSalesRepository.findOne({
      where: { id: creditId, tenantId },
      relations: ['sale'],
    });

    if (!creditSale) throw new NotFoundException('Crédito no encontrado');
    if (creditSale.status === 'PAID')
      throw new BadRequestException('Este crédito ya ha sido pagado');

    creditSale.status = 'PAID';
    creditSale.remainingAmount = 0;
    creditSale.paidAt = new Date();

    const closure = await this.getOpenClosure(tenantId, userId);

    // Si queremos que el pago completo también se registre como un abono histórico:
    const payment = this.creditPaymentsRepository.create({
      tenantId,
      creditSaleId: creditSale.id,
      amount: creditSale.amount, // En este caso es el total si se paga de una
      paymentDate: new Date(),
      paymentMethod: 'efectivo',
      notes: 'Pago total directo',
      closureId: closure ? closure.id : null,
    });
    await this.creditPaymentsRepository.save(payment);

    // Registrar en el cierre de caja actual
    if (closure) {
      closure.totalCreditPayments =
        Number(closure.totalCreditPayments) + Number(creditSale.amount);
      await this.cashClosureRepository.save(closure);
    }

    if (creditSale.sale) {
      creditSale.sale.paymentMethod = 'efectivo';
      await this.salesRepository.save(creditSale.sale);
    }

    return this.creditSalesRepository.save(creditSale);
  }

  async registerPartialPayment(
    tenantId: string,
    creditId: string,
    amount: number,
    userId: string,
    userName: string,
    notes?: string,
  ): Promise<CreditPayment> {
    const creditSale = await this.creditSalesRepository.findOne({
      where: { id: creditId, tenantId },
      relations: ['sale'],
    });

    if (!creditSale) throw new NotFoundException('Crédito no encontrado');
    if (creditSale.status === 'PAID')
      throw new BadRequestException('Este crédito ya está pagado');

    const remaining = Number(creditSale.remainingAmount);
    if (amount > remaining)
      throw new BadRequestException(
        'El abono no puede ser mayor a la deuda pendiente',
      );

    const closure = await this.getOpenClosure(tenantId, userId);

    const payment = this.creditPaymentsRepository.create({
      tenantId,
      creditSaleId: creditId,
      amount,
      paymentDate: new Date(),
      paymentMethod: 'efectivo',
      notes,
      closureId: closure ? closure.id : null,
    });

    await this.creditPaymentsRepository.save(payment);

    // Registrar en el cierre de caja actual
    if (closure) {
      closure.totalCreditPayments =
        Number(closure.totalCreditPayments) + Number(amount);
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

  async paySale(
    tenantId: string,
    saleId: string,
    userId: string,
    userName: string,
  ): Promise<void> {
    const creditSale = await this.creditSalesRepository.findOne({
      where: { saleId, tenantId },
      relations: ['sale'],
    });

    if (creditSale) {
      await this.payCreditSale(tenantId, creditSale.id, userId, userName);
    } else {
      // Si no hay registro en creditSales (ej: datos antiguos), buscamos la venta
      const sale = await this.salesRepository.findOne({
        where: { id: saleId, tenantId },
      });
      if (sale && sale.paymentMethod === 'credito') {
        sale.paymentMethod = 'efectivo';
        await this.salesRepository.save(sale);
        // Registrar en el cierre de caja actual si se actualiza una venta antigua
        const closure = await this.getOpenClosure(tenantId, userId);
        if (closure) {
          closure.totalCreditPayments =
            Number(closure.totalCreditPayments) + Number(sale.totalAmount);
          await this.cashClosureRepository.save(closure);
        }
      }
    }
  }

  async syncCredits(tenantId: string): Promise<any> {
    const sales = await this.salesRepository.find({
      where: { tenantId, paymentMethod: 'credito' },
    });

    let creditCreated = 0;
    let customerCreated = 0;
    let linked = 0;

    for (const sale of sales) {
      // 1. Asegurar que exista el CreditSale
      let creditSale = await this.creditSalesRepository.findOne({
        where: { saleId: sale.id, tenantId },
      });

      if (!creditSale) {
        creditSale = this.creditSalesRepository.create({
          tenantId,
          saleId: sale.id,
          customerName: sale.customerName || 'Cliente Recuperado',
          amount: sale.totalAmount,
          remainingAmount: sale.totalAmount,
          status: 'PENDING',
          createdAt: sale.createdAt,
        });
        await this.creditSalesRepository.save(creditSale);
        creditCreated++;
      }

      // 2. Sincronizar con Entidad Customer
      if (creditSale.customerName && !creditSale.customerId) {
        // Buscar cliente por nombre (insensible a mayúsculas/minúsculas)
        let customer = await this.customerRepository
          .createQueryBuilder('customer')
          .where('LOWER(customer.name) = LOWER(:name)', {
            name: creditSale.customerName,
          })
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
      totalSales: sales.length,
    };
  }

  async createRefund(
    tenantId: string,
    userId: string,
    userName: string,
    dto: CreateRefundDto,
  ): Promise<Refund> {
    const sale = await this.salesRepository.findOne({
      where: { id: dto.saleId, tenantId },
      relations: ['items'],
    });

    if (!sale) throw new NotFoundException('Venta original no encontrada');

    const closure = await this.getOpenClosure(tenantId, userId);
    if (!closure) throw new BadRequestException('Debe abrir la caja primero');

    return await this.dataSource.transaction(
      async (transactionalEntityManager) => {
        const refund = transactionalEntityManager.create(Refund, {
          tenantId,
          saleId: dto.saleId,
          userId,
          totalAmount: dto.totalAmount,
          reason: dto.reason,
          items: dto.items.map((item) => ({
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: item.subtotal,
            returnsToInventory: item.returnsToInventory ?? true,
          })),
        });

        const savedRefund =
          await transactionalEntityManager.save<Refund>(refund);

        // Ajustar inventario y caja
        for (const item of dto.items) {
          if (item.returnsToInventory !== false) {
            // Usamos valor negativo para SUMAR al stock (0.5 -> -0.5 => stock - (-0.5) = stock + 0.5)
            await this.productsService.updateStock(
              tenantId,
              item.productId,
              -item.quantity,
              transactionalEntityManager,
            );
          }
        }

        // Si la venta original fue en efectivo, restamos del cierre de caja actual
        if (sale.paymentMethod === 'efectivo') {
          closure.totalCashSales =
            Number(closure.totalCashSales) - Number(dto.totalAmount);
          await transactionalEntityManager.save<CashClosure>(closure);
        } else if (sale.paymentMethod === 'credito') {
          // Si fue crédito, buscamos el registro de crédito para ajustar el saldo
          const creditSale = await transactionalEntityManager.findOne(
            CreditSale,
            {
              where: { saleId: sale.id, tenantId },
            },
          );
          if (creditSale) {
            creditSale.remainingAmount =
              Number(creditSale.remainingAmount) - Number(dto.totalAmount);
            if (creditSale.remainingAmount <= 0) {
              creditSale.remainingAmount = 0;
              creditSale.status = 'PAID';
              creditSale.paidAt = new Date();
            }
            await transactionalEntityManager.save<CreditSale>(creditSale);
          }
        }

        return savedRefund;
      },
    );
  }

  async findAllRefunds(tenantId: string): Promise<Refund[]> {
    return this.refundRepository.find({
      where: { tenantId },
      relations: ['items'],
      order: { createdAt: 'DESC' },
    });
  }

  async createLegacyDebt(
    tenantId: string,
    userId: string,
    userName: string,
    customerId: string,
    amount: number,
  ): Promise<CreditSale> {
    const closure = await this.getOpenClosure(tenantId, userId);
    if (!closure) throw new BadRequestException('Debe abrir la caja primero');
    const customer = await this.customerRepository.findOne({
      where: { id: customerId, tenantId },
    });

    if (!customer) throw new NotFoundException('Cliente no encontrado');

    return await this.dataSource.transaction(
      async (transactionalEntityManager) => {
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
      },
    );
  }

  async updateClosureExpenses(
    closureId: string,
    amount: number,
  ): Promise<void> {
    const closure = await this.cashClosureRepository.findOne({
      where: { id: closureId },
    });
    if (closure) {
      closure.totalExpenses =
        Number(closure.totalExpenses || 0) + Number(amount);
      await this.cashClosureRepository.save(closure);
    }
  }

  async getPaymentsByClosure(
    tenantId: string,
    closureId: string,
  ): Promise<CreditPayment[]> {
    return this.creditPaymentsRepository.find({
      where: { tenantId, closureId },
      relations: ['creditSale', 'creditSale.sale', 'creditSale.customer'],
      order: { paymentDate: 'ASC' },
    });
  }

  async bulkPayCreditSales(
    tenantId: string,
    creditIds: string[],
    userId: string,
    userName: string,
  ): Promise<any> {
    const results = [];
    for (const id of creditIds) {
      try {
        const res = await this.payCreditSale(tenantId, id, userId, userName);
        results.push({ id, success: true, amount: res.amount });
      } catch (e) {
        results.push({ id, success: false, error: e.message });
      }
    }
    return results;
  }

  async payTotalCustomerDebt(
    tenantId: string,
    customerId: string,
    amount: number,
    userId: string,
    userName: string,
    notes?: string,
  ): Promise<any> {
    const pendingSales = await this.creditSalesRepository.find({
      where: {
        customerId,
        tenantId,
        status: In(['PENDING', 'PARTIAL']),
      },
      order: { createdAt: 'ASC' }, // FIFO: Pagar las más antiguas primero
    });

    let remainingPayment = Number(amount);
    const payments = [];

    for (const credit of pendingSales) {
      if (remainingPayment <= 0) break;

      const debt = Number(credit.remainingAmount);
      const paymentAmount = Math.min(debt, remainingPayment);

      const payment = await this.registerPartialPayment(
        tenantId,
        credit.id,
        paymentAmount,
        userId,
        userName,
        notes || `Abono a deuda total - distribuido automáticamente`,
      );

      payments.push(payment);
      remainingPayment -= paymentAmount;
    }

    return {
      totalDistributed: Number(amount) - remainingPayment,
      change: remainingPayment,
      paymentsCount: payments.length,
    };
  }

  async bulkRegisterPartialPayments(
    tenantId: string,
    payments: { creditId: string; amount: number }[],
    userId: string,
    userName: string,
    notes?: string,
  ): Promise<any> {
    const results = [];
    for (const p of payments) {
      if (Number(p.amount) <= 0) continue;
      try {
        const res = await this.registerPartialPayment(
          tenantId,
          p.creditId,
          p.amount,
          userId,
          userName,
          notes || 'Abono manual seleccionado',
        );
        results.push({ id: p.creditId, success: true, amount: p.amount });
      } catch (e) {
        results.push({ id: p.creditId, success: false, error: e.message });
      }
    }
    return results;
  }
}
