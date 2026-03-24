const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Manually parse .env since dotenv might not be available or working as expected
const envContent = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) env[key.trim()] = value.trim();
});

async function run() {
  const client = new Client({
    host: env.DB_HOST || 'localhost',
    port: env.DB_PORT || 5432,
    user: env.DB_USER || 'postgres',
    password: env.DB_PASSWORD || 'password123',
    database: env.DB_NAME || 'tiendeo',
  });
  await client.connect();
  const res = await client.query('SELECT "tenantId", email, name FROM users');
  console.log('USERS_DATA:' + JSON.stringify(res.rows));
  await client.end();
}
run().catch(console.error);
