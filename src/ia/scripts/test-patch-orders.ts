/**
 * Test rápido de PATCH /orders con ID real
 */
import * as jwt from 'jsonwebtoken';
import * as dotenv from 'dotenv';
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'halleycol-super-secret-key-2026';

async function test() {
  const adminToken = jwt.sign({ id: 1, username: 'admin', role: 'admin' }, JWT_SECRET);
  const logisticaToken = jwt.sign({ id: 3, username: 'logistica1', role: 'logistica' }, JWT_SECRET);
  const ventasToken = jwt.sign({ id: 2, username: 'ventas1', role: 'ventas' }, JWT_SECRET);
  
  const pedidoId = 'HLC-1777341053981';
  const baseUrl = 'http://localhost:3000/api/crm/orders/' + pedidoId;
  
  console.log('\n🔵 Probando PATCH /orders/:id con ID real:', pedidoId);
  console.log('   ' + '─'.repeat(50));
  
  // Test admin
  const adminRes = await fetch(baseUrl, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Cookie': 'auth_token=' + adminToken },
    body: JSON.stringify({ estado: 'Test' }),
  });
  console.log(`   admin:       ${adminRes.status} ${adminRes.ok ? '✅ ACCESO' : '❌ DENEGADO'}`);
  
  // Test logistica
  const logisticaRes = await fetch(baseUrl, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Cookie': 'auth_token=' + logisticaToken },
    body: JSON.stringify({ estado: 'Test' }),
  });
  console.log(`   logistica:   ${logisticaRes.status} ${logisticaRes.ok ? '✅ ACCESO' : '❌ DENEGADO'}`);
  
  // Test ventas (debería fallar)
  const ventasRes = await fetch(baseUrl, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Cookie': 'auth_token=' + ventasToken },
    body: JSON.stringify({ estado: 'Test' }),
  });
  console.log(`   ventas:      ${ventasRes.status} ${!ventasRes.ok && ventasRes.status === 403 ? '✅ DENEGADO (correcto)' : '❌ ACCESO (error)'}`);
  
  console.log('   ' + '─'.repeat(50));
  
  const passed = adminRes.ok && logisticaRes.ok && ventasRes.status === 403;
  console.log(passed ? '\n   ✅ ¡Todos los tests pasaron!\n' : '\n   ❌ Algo falló\n');
}

test().catch(console.error);
