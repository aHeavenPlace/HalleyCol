/**
 * @file fix-sequences.ts
 * @description Script para resetear las secuencias de las tablas después de migrar datos
 */

import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: Number(process.env.PGPORT) || 5432,
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || '12345678',
  database: process.env.PGDATABASE || 'halleycol_db',
  ssl: true,
});

async function fixSequences() {
  const client = await pool.connect();
  try {
    console.log('🔧 Resetear secuencias de tablas...\n');

    // Resetear secuencia de mensajes
    await client.query(`
      SELECT setval('mensajes_id_seq', COALESCE((SELECT MAX(id) FROM mensajes), 0) + 1, false);
    `);
    console.log('✅ Secuencia mensajes_id_seq reseteada');

    // Resetear secuencia de conversaciones
    await client.query(`
      SELECT setval('conversaciones_id_seq', COALESCE((SELECT MAX(id) FROM conversaciones), 0) + 1, false);
    `);
    console.log('✅ Secuencia conversaciones_id_seq reseteada');

    // Resetear secuencia de pedidos
    await client.query(`
      SELECT setval('pedidos_id_seq', COALESCE((SELECT MAX(id) FROM pedidos), 0) + 1, false);
    `);
    console.log('✅ Secuencia pedidos_id_seq reseteada');

    console.log('\n✅ Secuencias reseteadas exitosamente.\n');

  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

fixSequences();
