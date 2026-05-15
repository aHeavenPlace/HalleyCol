/**
 * @file setup-db.ts
 * @description Script para crear la tabla `productos` en PostgreSQL y cargar datos reales
 *              desde `real-catalog.ts`.  Se usa para la demo y para la
 *              presentación del proyecto.
 */

import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import { realCatalog } from '../data/real-catalog';

dotenv.config();

// Configuración de la conexión (las credenciales ya están en .env)
const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: Number(process.env.PGPORT) || 5432,
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || '12345678',
  database: process.env.PGDATABASE || 'halleycol_db',
});

import * as bcrypt from 'bcrypt';

async function createTable() {
  const client = await pool.connect();
  try {
    // 1. Tabla de Productos
    await client.query(`
      CREATE TABLE IF NOT EXISTS productos (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        brand TEXT NOT NULL,
        price INTEGER NOT NULL,
        category TEXT NOT NULL,
        available_sizes TEXT[] NOT NULL,
        stock JSONB NOT NULL
      );
    `);

    // 2. Tabla de Usuarios (Auth)
    await client.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'personal'
      );
    `);

    // 3. Tabla de Pedidos
    await client.query(`
      CREATE TABLE IF NOT EXISTS pedidos (
        id TEXT PRIMARY KEY,
        numero_orden TEXT UNIQUE NOT NULL,
        cliente_nombre TEXT,
        cliente_whatsapp TEXT,
        ciudad TEXT,
        direccion TEXT,
        productos TEXT,
        total INTEGER,
        metodo_pago TEXT,
        estado TEXT DEFAULT 'Pendiente',
        comprobante_url TEXT,
        guia_tracker TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Agregamos la columna si ya existe la tabla pero no la columna (Migración)
    await client.query(`
      ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS comprobante_url TEXT;
    `);

    // 4. Tabla de Conversaciones
    await client.query(`
      CREATE TABLE IF NOT EXISTS conversaciones (
        session_id TEXT PRIMARY KEY,
        cliente_whatsapp TEXT,
        estado_fsm TEXT,
        necesita_asesor BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 5. Tabla de Mensajes
    await client.query(`
      CREATE TABLE IF NOT EXISTS mensajes (
        id SERIAL PRIMARY KEY,
        session_id TEXT REFERENCES conversaciones(session_id),
        emisor TEXT NOT NULL, -- 'user', 'bot', 'asesor'
        contenido TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('[setup-db] Tablas creadas exitosamente.');

    // Crear usuarios por defecto si no existen
    const res = await client.query('SELECT * FROM usuarios WHERE username = $1', ['admin']);
    if (res.rowCount === 0) {
      // Admin
      const adminHash = await bcrypt.hash('admin123', 10);
      await client.query('INSERT INTO usuarios (username, password_hash, role) VALUES ($1, $2, $3)', ['admin', adminHash, 'admin']);

      // Ventas
      const ventasHash = await bcrypt.hash('ventas123', 10);
      await client.query('INSERT INTO usuarios (username, password_hash, role) VALUES ($1, $2, $3)', ['ventas1', ventasHash, 'ventas']);

      // Logistica
      const logisticaHash = await bcrypt.hash('logistica123', 10);
      await client.query('INSERT INTO usuarios (username, password_hash, role) VALUES ($1, $2, $3)', ['logistica1', logisticaHash, 'logistica']);

      // Asesor
      const asesorHash = await bcrypt.hash('asesor123', 10);
      await client.query('INSERT INTO usuarios (username, password_hash, role) VALUES ($1, $2, $3)', ['asesor1', asesorHash, 'asesor']);

      console.log('[setup-db] Usuarios por defecto creados (admin, ventas1, logistica1, asesor1).');
    }

  } finally {
    client.release();
  }
}

async function insertProducts() {
  const client = await pool.connect();
  try {
    for (const p of Object.values(realCatalog)) {
      const product: any = p;
      await client.query(
        `INSERT INTO productos (id, name, brand, price, category, available_sizes, stock)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           brand = EXCLUDED.brand,
           price = EXCLUDED.price,
           category = EXCLUDED.category,
           available_sizes = EXCLUDED.available_sizes,
           stock = EXCLUDED.stock;`,
        [
          product.id,
          product.name,
          product.brand,
          product.price,
          product.category,
          product.availableSizes,
          product.stock,
        ]
      );
    }
    console.log('[setup-db] Catálogo real insertado/actualizado');
  } finally {
    client.release();
  }
}

async function main() {
  await createTable();
  await insertProducts();
  await pool.end();
  console.log('[setup-db] Proceso completado');
}

main().catch(err => {
  console.error('[setup-db] Error:', err);
  process.exit(1);
});
