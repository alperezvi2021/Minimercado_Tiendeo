const { Client } = require('pg');
const bcrypt = require('bcrypt');

const client = new Client({
  user: 'postgres',
  host: 'localhost',
  database: 'tiendeo',
  password: 'password123',
  port: 5432,
});

async function resetPassword() {
  await client.connect();
  const passwordHash = await bcrypt.hash('admin123', 10);
  
  const res = await client.query(
    'UPDATE users SET "passwordHash" = $1 WHERE email = $2',
    [passwordHash, 'admin@test.com']
  );
  
  if (res.rowCount > 0) {
    console.log('Password reset successful for admin@test.com to admin123');
  } else {
    console.log('User admin@test.com not found');
  }
  
  await client.end();
}

resetPassword().catch(console.error);
