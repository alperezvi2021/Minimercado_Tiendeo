const { Client } = require('pg');
const bcrypt = require('bcrypt');

const client = new Client({
  user: 'postgres',
  host: 'localhost',
  database: 'tiendeo',
  password: 'password123',
  port: 5432,
});

async function elevateUser() {
  await client.connect();
  const hash = await bcrypt.hash('admin123', 10);
  
  const res = await client.query(
    'UPDATE users SET "passwordHash" = $1, role = \'SUPER_ADMIN\' WHERE email = $2',
    [hash, 'alperezvi@gmail.com']
  );
  
  if (res.rowCount > 0) {
    console.log('User alperezvi@gmail.com updated with password admin123 and role SUPER_ADMIN');
  } else {
    console.log('User alperezvi@gmail.com not found');
  }
  
  await client.end();
}

elevateUser().catch(console.error);
