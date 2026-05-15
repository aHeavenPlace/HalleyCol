/**
 * @file migrate-to-render.ts
 * @description Script para migrar todos los datos desde la base de datos local PostgreSQL
 *              hacia la base de datos en Render.
 */

import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import { realCatalog } from '../data/real-catalog';

dotenv.config();

// Pool para base de datos LOCAL (origen)
const localPool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: Number(process.env.PGPORT) || 5432,
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || '12345678',
  database: process.env.PGDATABASE || 'halleycol_db',
});

// Pool para base de datos RENDER (destino)
// Credenciales desde Render - External Database URL
const renderPool = new Pool({
  host: 'dpg-d836144vikkc73ctvhfg-a.oregon-postgres.render.com',
  port: 5432,
  user: 'halleycol_user',
  password: 'Kg0wvFbP1w8kGufs4yKY02n6VKNL29Ca',
  database: 'halleycol',
  ssl: { rejectUnauthorized: false }, // Render requiere SSL para conexiones externas
});

async function createSchema(client: any) {
  console.log('📐 Creando esquema en Render...');

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

  // 2. Tabla de Usuarios
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
      emisor TEXT NOT NULL,
      contenido TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log('✅ Esquema creado en Render.');
}

async function migrateProducts(renderClient: any) {
  console.log(' Migrando productos...');

  for (const p of Object.values(realCatalog)) {
    const product: any = p;
    await renderClient.query(
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

  const result = await renderClient.query('SELECT COUNT(*) FROM productos');
  console.log(`✅ ${result.rows[0].count} productos migrados.`);
}

async function migrateUsers(renderClient: any) {
  console.log('👥 Migrando usuarios...');

  const localClient = await localPool.connect();
  try {
    const users = await localClient.query('SELECT * FROM usuarios');

    for (const user of users.rows) {
      await renderClient.query(
        `INSERT INTO usuarios (id, username, password_hash, role)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (username) DO UPDATE SET
           password_hash = EXCLUDED.password_hash,
           role = EXCLUDED.role;`,
        [user.id, user.username, user.password_hash, user.role]
      );
    }

    console.log(`✅ ${users.rows.length} usuario(s) migrado(s).`);
  } finally {
    localClient.release();
  }
}

async function migratePedidos(renderClient: any) {
  console.log('📋 Migrando pedidos...');

  const localClient = await localPool.connect();
  try {
    const pedidos = await localClient.query('SELECT * FROM pedidos');

    for (const pedido of pedidos.rows) {
      await renderClient.query(
        `INSERT INTO pedidos 
         (id, numero_orden, cliente_nombre, cliente_whatsapp, ciudad, direccion, productos, total, metodo_pago, estado, comprobante_url, guia_tracker, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         ON CONFLICT (id) DO UPDATE SET
           numero_orden = EXCLUDED.numero_orden,
           cliente_nombre = EXCLUDED.cliente_nombre,
           cliente_whatsapp = EXCLUDED.cliente_whatsapp,
           ciudad = EXCLUDED.ciudad,
           direccion = EXCLUDED.direccion,
           productos = EXCLUDED.productos,
           total = EXCLUDED.total,
           metodo_pago = EXCLUDED.metodo_pago,
           estado = EXCLUDED.estado,
           comprobante_url = EXCLUDED.comprobante_url,
           guia_tracker = EXCLUDED.guia_tracker,
           created_at = EXCLUDED.created_at;`,
        [
          pedido.id,
          pedido.numero_orden,
          pedido.cliente_nombre,
          pedido.cliente_whatsapp,
          pedido.ciudad,
          pedido.direccion,
          pedido.productos,
          pedido.total,
          pedido.metodo_pago,
          pedido.estado,
          pedido.comprobante_url,
          pedido.guia_tracker,
          pedido.created_at,
        ]
      );
    }

    console.log(`✅ ${pedidos.rows.length} pedido(s) migrado(s).`);
  } finally {
    localClient.release();
  }
}

async function migrateConversaciones(renderClient: any) {
  console.log('💬 Migrando conversaciones...');

  const localClient = await localPool.connect();
  try {
    const conversaciones = await localClient.query('SELECT * FROM conversaciones');

    for (const conv of conversaciones.rows) {
      await renderClient.query(
        `INSERT INTO conversaciones 
         (session_id, cliente_whatsapp, estado_fsm, necesita_asesor, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (session_id) DO UPDATE SET
           cliente_whatsapp = EXCLUDED.cliente_whatsapp,
           estado_fsm = EXCLUDED.estado_fsm,
           necesita_asesor = EXCLUDED.necesita_asesor,
           created_at = EXCLUDED.created_at,
           updated_at = EXCLUDED.updated_at;`,
        [
          conv.session_id,
          conv.cliente_whatsapp,
          conv.estado_fsm,
          conv.necesita_asesor,
          conv.created_at,
          conv.updated_at,
        ]
      );
    }

    console.log(`✅ ${conversaciones.rows.length} conversacion(es) migrada(s).`);
  } finally {
    localClient.release();
  }
}

async function migrateMensajes(renderClient: any) {
  console.log('📨 Migrando mensajes...');

  const localClient = await localPool.connect();
  try {
    const mensajes = await localClient.query('SELECT * FROM mensajes');

    for (const msg of mensajes.rows) {
      await renderClient.query(
        `INSERT INTO mensajes (id, session_id, emisor, contenido, created_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO UPDATE SET
           session_id = EXCLUDED.session_id,
           emisor = EXCLUDED.emisor,
           contenido = EXCLUDED.contenido,
           created_at = EXCLUDED.created_at;`,
        [
          msg.id,
          msg.session_id,
          msg.emisor,
          msg.contenido,
          msg.created_at,
        ]
      );
    }

    console.log(`✅ ${mensajes.rows.length} mensaje(s) migrado(s).`);
  } finally {
    localClient.release();
  }
}

async function verifyMigration() {
  console.log('\n🔍 Verificando migración en Render...\n');

  const renderClient = await renderPool.connect();
  try {
    const tables = [
      { name: 'productos', query: 'SELECT COUNT(*) FROM productos' },
      { name: 'usuarios', query: 'SELECT COUNT(*) FROM usuarios' },
      { name: 'pedidos', query: 'SELECT COUNT(*) FROM pedidos' },
      { name: 'conversaciones', query: 'SELECT COUNT(*) FROM conversaciones' },
      { name: 'mensajes', query: 'SELECT COUNT(*) FROM mensajes' },
    ];

    for (const table of tables) {
      const result = await renderClient.query(table.query);
      console.log(`   ${table.name}: ${result.rows[0].count} registros`);
    }
  } finally {
    renderClient.release();
  }
}

async function main() {
  console.log('🚀 Iniciando migración a Render...\n');

  const renderClient = await renderPool.connect();
  const localClient = await localPool.connect();

  try {
    // 1. Crear esquema
    await createSchema(renderClient);

    // 2. Migrar datos
    await migrateProducts(renderClient);
    await migrateUsers(renderClient);
    await migratePedidos(renderClient);
    await migrateConversaciones(renderClient);
    await migrateMensajes(renderClient);

    // 3. Verificar
    await verifyMigration();

    console.log('\n✅ ¡Migración completada exitosamente!\n');
    console.log('📌 Nota: Actualiza tu .env con las credenciales de Render para usar la nueva DB.');
    console.log('\n   External Database URL:');
    console.log('   postgresql://halleycol_user:Kg0wvFbP1w8kGufs4yKY02n6VKNL29Ca@dpg-d836144vikkc73ctvhfg-a/halleycol\n');

  } catch (err) {
    console.error('\n❌ Error durante la migración:', err);
    process.exit(1);
  } finally {
    renderClient.release();
    localClient.release();
    await renderPool.end();
    await localPool.end();
  }
}

main();
