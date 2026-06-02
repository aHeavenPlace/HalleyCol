import { Pool } from 'pg';
import * as dotenv from 'dotenv';
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
  await pool.query('ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS comprobante_url TEXT');
  const r = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name='pedidos' ORDER BY ordinal_position`);
  console.log('OK - Columns:', r.rows.map((x: any) => x.column_name).join(', '));
  await pool.end();
}
main().catch(e => { console.error('Migration error:', e.message); process.exit(1); });
