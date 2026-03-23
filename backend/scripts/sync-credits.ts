import { createConnection } from 'typeorm';
import { Sale } from '../src/sales/entities/sale.entity';
import { CreditSale } from '../src/sales/entities/credit-sale.entity';
import { SaleItem } from '../src/sales/entities/sale-item.entity';
import { CashClosure } from '../src/sales/entities/cash-closure.entity';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function sync() {
  console.log('Iniciando sincronización de créditos legados...');
  
  const connection = await createConnection({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USER || 'tiendeo_user',
    password: process.env.DB_PASSWORD || 'tiendeo_pass',
    database: process.env.DB_NAME || 'tiendeo_db',
    entities: [Sale, CreditSale, SaleItem, CashClosure],
    logging: false,
  });

  try {
    const saleRepo = connection.getRepository(Sale);
    const creditRepo = connection.getRepository(CreditSale);

    // 1. Buscar todas las ventas que son crédito
    const allCreditSales = await saleRepo.find({
      where: { paymentMethod: 'credito' }
    });

    console.log(`Analizando ${allCreditSales.length} ventas de crédito encontradas en la tabla 'sales'...`);

    let createdCount = 0;
    let updatedNameCount = 0;

    for (const sale of allCreditSales) {
      const existingCredit = await creditRepo.findOne({ where: { saleId: sale.id } });

      if (!existingCredit) {
        // Crear el registro que faltaba
        const newCredit = creditRepo.create({
          tenantId: sale.tenantId,
          saleId: sale.id,
          customerName: sale.customerName || 'Cliente Recuperado',
          amount: sale.totalAmount,
          status: 'PENDING',
          createdAt: sale.createdAt
        });
        await creditRepo.save(newCredit);
        createdCount++;
        console.log(`[NUEVO] Crédito creado para venta ${sale.id.substring(0,8)} - Cliente: ${sale.customerName || 'Desconocido'}`);
      } else {
        // Si ya existe pero el nombre es genérico y la venta tiene nombre, actualizarlo
        if ((existingCredit.customerName === 'Cliente Genérico' || !existingCredit.customerName) && sale.customerName && sale.customerName !== 'Cliente Genérico') {
          existingCredit.customerName = sale.customerName;
          await creditRepo.save(existingCredit);
          updatedNameCount++;
          console.log(`[ACTUALIZADO] Nombre corregido para venta ${sale.id.substring(0,8)} -> ${sale.customerName}`);
        }
      }
    }

    console.log('\n--- RESULTADO DE SINCRONIZACIÓN ---');
    console.log(`Registros de crédito creados: ${createdCount}`);
    console.log(`Nombres de cliente actualizados: ${updatedNameCount}`);
    console.log('-----------------------------------\n');

  } catch (error) {
    console.error('Error durante la sincronización:', error);
  } finally {
    await connection.close();
  }
}

sync().catch(console.error);
