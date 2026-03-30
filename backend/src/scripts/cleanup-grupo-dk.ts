import { createConnection, getRepository } from 'typeorm';
import { Tenant } from '../tenants/entities/tenant.entity';
import { Customer } from '../customers/entities/customer.entity';
import { CreditSale } from '../sales/entities/credit-sale.entity';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function run() {
  const connection = await createConnection({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password123',
    database: process.env.DB_NAME || 'tiendeo',
    entities: [Tenant, Customer, CreditSale],
    synchronize: false,
  });

  const tenantRepo = getRepository(Tenant);
  const customerRepo = getRepository(Customer);
  const creditRepo = getRepository(CreditSale);

  const tenant = await tenantRepo.findOne({ where: { name: 'TIENDA GRUPO DK' } });
  if (!tenant) {
    console.log('Tenant "TIENDA GRUPO DK" not found.');
    await connection.close();
    return;
  }
  console.log(`Found Tenant: ${tenant.name} (${tenant.id})`);

  const customersToDelete = await customerRepo.find({
    where: [
      { tenantId: tenant.id, name: 'Cliente Genérico' },
      { tenantId: tenant.id, name: 'Cliente Recuperado' },
      { tenantId: tenant.id, name: 'daniel' },
      { tenantId: tenant.id, name: 'Juan Perez' }
    ]
  });

  for (const customer of customersToDelete) {
    console.log(`Deleting customer: ${customer.name} (${customer.id})`);
    
    // Delete associated credits first
    const credits = await creditRepo.find({ where: { customerId: customer.id } });
    if (credits.length > 0) {
      console.log(`  Deleting ${credits.length} credit records...`);
      await creditRepo.remove(credits);
    }
    
    await customerRepo.remove(customer);
  }

  console.log('Cleanup complete.');
  await connection.close();
}

run().catch(console.error);
