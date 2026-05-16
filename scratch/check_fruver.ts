import { DataSource } from 'typeorm';
import { User } from './backend/src/users/entities/user.entity';
import { Tenant } from './backend/src/tenants/entities/tenant.entity';

async function checkFruver() {
  const ds = new DataSource({
    type: 'postgres',
    host: 'localhost',
    port: 5432,
    username: 'postgres',
    password: 'password123',
    database: 'tiendeo',
    entities: [User, Tenant],
  });

  try {
    await ds.initialize();
    
    console.log('--- BUSCANDO TENANTS CON NOMBRE "FRUVER" ---');
    const tenants = await ds.getRepository(Tenant).find();
    const fruvers = tenants.filter(t => t.name.toLowerCase().includes('fruver'));
    console.table(fruvers.map(t => ({ id: t.id, name: t.name, createdAt: t.createdAt })));

    console.log('\n--- BUSCANDO USUARIOS ASOCIADOS A londonomarisol344@gmail.com ---');
    const marisolUsers = await ds.getRepository(User).find({ 
      where: { email: 'londonomarisol344@gmail.com' },
      relations: ['tenant']
    });
    console.table(marisolUsers.map(u => ({ 
      id: u.id, 
      role: u.role, 
      tenantName: u.tenant?.name, 
      tenantId: u.tenantId 
    })));

    if (fruvers.length > 0) {
      console.log('\n--- BUSCANDO TODOS LOS USUARIOS DE LOS TENANTS DE FRUVER ---');
      const fruverIds = fruvers.map(f => f.id);
      const fruverUsers = await ds.getRepository(User).find({
        where: { tenantId: { $in: fruverIds } as any },
        relations: ['tenant']
      });
      console.table(fruverUsers.map(u => ({
        id: u.id,
        email: u.email,
        role: u.role,
        tenantName: u.tenant?.name
      })));
    }

    await ds.destroy();
  } catch (e) {
    console.error('Error:', e);
  }
}

checkFruver();
