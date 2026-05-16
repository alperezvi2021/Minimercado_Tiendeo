const { DataSource } = require('typeorm');
const path = require('path');

// Mock entities for quick DB check if possible, or just use raw queries
async function checkFruver() {
  const ds = new DataSource({
    type: 'postgres',
    host: 'localhost',
    port: 5432,
    username: 'postgres',
    password: 'password123',
    database: 'tiendeo',
  });

  try {
    await ds.initialize();
    
    console.log('--- BUSCANDO TENANTS CON NOMBRE "FRUVER" ---');
    const fruvers = await ds.query(`SELECT id, name, "createdAt" FROM tenants WHERE name ILIKE '%fruver%'`);
    console.table(fruvers);

    console.log('\n--- BUSCANDO USUARIOS ASOCIADOS A londonomarisol344@gmail.com ---');
    const marisolUsers = await ds.query(`
      SELECT u.id, u.role, t.name as "tenantName", u."tenantId" 
      FROM users u 
      LEFT JOIN tenants t ON u."tenantId" = t.id 
      WHERE u.email = 'londonomarisol344@gmail.com'
    `);
    console.table(marisolUsers);

    if (fruvers.length > 0) {
      console.log('\n--- BUSCANDO TODOS LOS USUARIOS DE LOS TENANTS DE FRUVER ---');
      const fruverIds = fruvers.map(f => `'${f.id}'`).join(',');
      const fruverUsers = await ds.query(`
        SELECT u.id, u.email, u.role, t.name as "tenantName" 
        FROM users u 
        LEFT JOIN tenants t ON u."tenantId" = t.id 
        WHERE u."tenantId" IN (${fruverIds})
      `);
      console.table(fruverUsers);
    }

    await ds.destroy();
  } catch (e) {
    console.log('Error de conexión o base de datos. Es probable que el servicio no esté disponible en este entorno de ejecución directo.');
    console.error(e.message);
  }
}

checkFruver();
