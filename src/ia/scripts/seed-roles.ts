/**
 * @file seed-roles.ts
 * @description Script para agregar los roles y usuarios de ejemplo al sistema.
 *              Roles: admin, ventas, logistica, asesor
 */

import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as bcrypt from 'bcrypt';

dotenv.config();

const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: Number(process.env.PGPORT) || 5432,
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || '12345678',
  database: process.env.PGDATABASE || 'halleycol_db',
});

const usuariosEjemplo = [
  { username: 'admin', password: 'admin123', role: 'admin' },
  { username: 'ventas1', password: 'ventas123', role: 'ventas' },
  { username: 'ventas2', password: 'ventas123', role: 'ventas' },
  { username: 'logistica1', password: 'logistica123', role: 'logistica' },
  { username: 'asesor1', password: 'asesor123', role: 'asesor' },
  { username: 'asesor2', password: 'asesor123', role: 'asesor' },
];

async function seedRoles() {
  const client = await pool.connect();
  try {
    console.log('🌱 Sembrando roles y usuarios de ejemplo...\n');

    for (const usuario of usuariosEjemplo) {
      const passwordHash = await bcrypt.hash(usuario.password, 10);
      
      await client.query(
        `INSERT INTO usuarios (username, password_hash, role)
         VALUES ($1, $2, $3)
         ON CONFLICT (username) DO UPDATE SET
           password_hash = EXCLUDED.password_hash,
           role = EXCLUDED.role;`,
        [usuario.username, passwordHash, usuario.role]
      );

      console.log(`   ✅ ${usuario.username} (${usuario.role}) - Password: ${usuario.password}`);
    }

    const result = await client.query('SELECT username, role FROM usuarios ORDER BY role, username');
    
    console.log('\n📋 Usuarios en la base de datos:');
    console.log('   ─────────────────────────────────');
    result.rows.forEach(u => {
      console.log(`   - ${u.username.padEnd(12)} → ${u.role}`);
    });

    console.log('\n✅ Roles y usuarios sembrados exitosamente.\n');

  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seedRoles();
