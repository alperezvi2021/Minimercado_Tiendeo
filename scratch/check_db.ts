import { DataSource } from 'typeorm';
import { User } from './backend/src/users/entities/user.entity';
import { Tenant } from './backend/src/tenants/entities/tenant.entity';
import * as path from 'path';

async function checkData() {
  const ds = new DataSource({
    type: 'sqlite',
    database: 'database.sqlite', // Assuming this is the DB path
    entities: [User, Tenant],
  });

  try {
    await ds.initialize();
    const tenants = await ds.getRepository(Tenant).find();
    console.log('--- TENANTS ---');
    console.table(tenants.map(t => ({ id: t.id, name: t.name })));

    const users = await ds.getRepository(User).find({ relations: ['tenant'] });
    console.log('\n--- USERS ---');
    console.table(users.map(u => ({ 
      id: u.id, 
      email: u.email, 
      role: u.role, 
      tenantName: u.tenant?.name,
      tenantId: u.tenantId 
    })));

    await ds.destroy();
  } catch (e) {
    console.error('Error:', e);
  }
}

checkData();
