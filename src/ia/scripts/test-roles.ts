/**
 * @file test-roles.ts
 * @description Script para probar todos los roles y verificar los permisos de cada endpoint.
 */

import * as dotenv from 'dotenv';
import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcrypt';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'halleycol-super-secret-key-2026';
const BASE_URL = 'http://localhost:3000';

const usuarios = [
  { username: 'admin', password: 'admin123', role: 'admin' },
  { username: 'ventas1', password: 'ventas123', role: 'ventas' },
  { username: 'logistica1', password: 'logistica123', role: 'logistica' },
  { username: 'asesor1', password: 'asesor123', role: 'asesor' },
];

const endpoints = [
  { method: 'GET', path: '/api/crm/products', name: 'Productos (GET)', expectedRoles: ['admin', 'ventas', 'logistica', 'asesor'] },
  { method: 'POST', path: '/api/crm/products', name: 'Productos (POST)', expectedRoles: ['admin', 'ventas'], body: { id: 'test-123', name: 'Test', brand: 'Test', price: 100, category: 'test', available_sizes: ['M'], stock: {} } },
  { method: 'GET', path: '/api/crm/orders', name: 'Pedidos (GET)', expectedRoles: ['admin', 'ventas', 'logistica', 'asesor'] },
  { method: 'PATCH', path: '/api/crm/orders/1', name: 'Pedidos (PATCH)', expectedRoles: ['admin', 'logistica'], body: { estado: 'Enviado' } },
  { method: 'GET', path: '/api/crm/conversations', name: 'Conversaciones (GET)', expectedRoles: ['admin', 'asesor', 'ventas'] },
  { method: 'GET', path: '/api/crm/conversations/session-123/messages', name: 'Mensajes (GET)', expectedRoles: ['admin', 'asesor', 'ventas'] },
  { method: 'GET', path: '/api/crm/dashboard', name: 'Dashboard (GET)', expectedRoles: ['admin', 'ventas'] },
  { method: 'GET', path: '/api/crm/clients', name: 'Clientes (GET)', expectedRoles: ['admin', 'ventas'] },
  { method: 'GET', path: '/api/crm/reports', name: 'Reportes (GET)', expectedRoles: ['admin', 'ventas'] },
];

async function login(username: string, password: string): Promise<string> {
  // Generar token JWT directamente (simulando login)
  const passwordHash = await bcrypt.hash(password, 10);
  const user = { id: 1, username, role: usuarios.find(u => u.username === username)?.role, password_hash: passwordHash };

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '8h' }
  );

  return token;
}

async function testEndpoint(
  token: string,
  endpoint: typeof endpoints[0],
  username: string
): Promise<{ allowed: boolean; status: number; error?: string }> {
  try {
    const options: RequestInit = {
      method: endpoint.method,
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `auth_token=${token}`,
      },
    };

    if (endpoint.body && endpoint.method !== 'GET') {
      options.body = JSON.stringify(endpoint.body);
    }

    const response = await fetch(`${BASE_URL}${endpoint.path}`, options);

    return {
      allowed: response.ok,
      status: response.status,
      error: response.ok ? undefined : await response.text(),
    };
  } catch (error: any) {
    return {
      allowed: false,
      status: 0,
      error: error.message,
    };
  }
}

async function runTests() {
  console.log('🧪 Probando sistema de roles...\n');
  console.log(`   Base URL: ${BASE_URL}\n`);

  const results: any = {};

  for (const usuario of usuarios) {
    console.log(`\n👤 Usuario: ${usuario.username} (${usuario.role})`);
    console.log('   ' + '─'.repeat(50));

    const token = await login(usuario.username, usuario.password);
    results[usuario.role] = { allowed: 0, denied: 0, errors: [] as string[] };

    for (const endpoint of endpoints) {
      const result = await testEndpoint(token, endpoint, usuario.username);
      const expectedAccess = endpoint.expectedRoles.includes(usuario.role);
      const passed = result.allowed === expectedAccess;

      const icon = passed ? '✅' : '❌';
      const status = result.allowed ? `OK (${result.status})` : `DENEGADO (${result.status})`;

      if (!passed) {
        results[usuario.role].errors.push(`${endpoint.name}: esperado ${expectedAccess ? 'acceso' : 'denegado'}, obtuvo ${result.allowed ? 'acceso' : 'denegado'}`);
      } else {
        if (result.allowed) results[usuario.role].allowed++;
        else results[usuario.role].denied++;
      }

      console.log(`   ${icon} ${endpoint.name.padEnd(30)} → ${status}`);
    }
  }

  // Resumen
  console.log('\n\n📊 RESUMEN DE PERMISOS');
  console.log('   ' + '═'.repeat(50));

  for (const [role, data] of Object.entries(results) as [string, { allowed: number; denied: number; errors: string[] }][]) {
    const status = data.errors.length === 0 ? '✅' : '❌';
    console.log(`   ${status} ${role.padEnd(12)} → ${data.allowed} permitidos, ${data.denied} denegados`);
    if (data.errors.length > 0) {
      data.errors.forEach((err: string) => console.log(`      ⚠️  ${err}`));
    }
  }

  console.log('\n   ' + '═'.repeat(50));

  const totalErrors = Object.values(results).reduce((sum, r) => sum + (r as any).errors.length, 0);
  if (totalErrors === 0) {
    console.log('\n   ✅ ¡Todos los tests pasaron!\n');
  } else {
    console.log(`\n   ❌ ${totalErrors} test(s) fallaron\n`);
  }
}

runTests().catch(console.error);
