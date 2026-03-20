const { Client } = require('pg');
const bcrypt = require('bcrypt');

const client = new Client({
  user: 'postgres',
  host: 'localhost',
  database: 'tiendeo',
  password: 'password123',
  port: 5432,
});

async function createAdmin() {
  await client.connect();
  const passwordHash = await bcrypt.hash('admin123', 10);
  
  // Get a tenantId
  const resTenant = await client.query('SELECT id FROM tenants LIMIT 1');
  if (resTenant.rows.length === 0) {
    console.log('No tenants found');
    await client.end();
    return;
  }
  const tenantId = resTenant.rows[0].id;

  await client.query(
    'INSERT INTO users (id, "tenantId", name, email, "passwordHash", role) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)',
    [tenantId, 'Admin Test', 'admin@test.com', passwordHash, 'OWNER']
  );
  console.log('Admin user created: admin@test.com / admin123');
  await client.end();
}

createAdmin().catch(console.error);
