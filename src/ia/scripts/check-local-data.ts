/**
 * @file check-local-data.ts
 * @description Script para verificar qué datos existen en la base de datos local
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
});

async function checkData() {
  const client = await pool.connect();
  try {
    console.log('=== VERIFICANDO DATOS LOCALES ===\n');

    // Productos
    const productos = await client.query('SELECT COUNT(*) FROM productos');
    console.log(`📦 Productos: ${productos.rows[0].count}`);

    // Usuarios
    const usuarios = await client.query('SELECT id, username, role FROM usuarios');
    console.log(`👥 Usuarios (${usuarios.rowCount}):`);
    usuarios.rows.forEach(u => console.log(`   - ${u.username} (${u.role})`));

    // Pedidos
    const pedidos = await client.query('SELECT COUNT(*) FROM pedidos');
    console.log(` Pedidos: ${pedidos.rows[0].count}`);

    // Conversaciones
    const conversaciones = await client.query('SELECT COUNT(*) FROM conversaciones');
    console.log(`💬 Conversaciones: ${conversaciones.rows[0].count}`);

    // Mensajes
    const mensajes = await client.query('SELECT COUNT(*) FROM mensajes');
    console.log(`📨 Mensajes: ${mensajes.rows[0].count}`);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

checkData();
