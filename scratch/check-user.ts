import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function run() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
  }
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();
  try {
    const res = await client.query("SELECT id, email, role, department, is_active FROM users");
    console.log(res.rows);
  } catch (err: any) {
    console.error('Error running query:', err.message);
  } finally {
    await client.end();
  }
}

run();
