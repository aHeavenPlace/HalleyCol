import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
dotenv.config();
const pool = new Pool({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT) || 5432,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  ssl: true
});
async function main() {
  const r = await pool.query(`SELECT id, cliente_whatsapp, estado, comprobante_url FROM pedidos ORDER BY created_at DESC LIMIT 5`);
  fs.writeFileSync('db_output.json', JSON.stringify(r.rows, null, 2), 'utf8');
  await pool.end();
}
main().catch(e => { console.error('Error:', e.message); process.exit(1); });
