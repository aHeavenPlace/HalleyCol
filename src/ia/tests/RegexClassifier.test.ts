/**
 * @file RegexClassifier.test.ts
 * @description Tests unitarios para el RegexClassifier (MVP v1.0.0).
 * Cubre clasificación de intenciones, extracción de entidades,
 * generación de respuestas y gestión de sesiones.
 *
 * Para ejecutar:
 *   npx jest src/ia/tests/RegexClassifier.test.ts
 *   npx ts-node src/ia/tests/RegexClassifier.test.ts  (sin Jest)
 *
 * @module ia/tests
 * @version 1.0.0
 */

import { RegexClassifier } from '../services/RegexClassifier.service';
import { ConversationContext, IntentResult } from '../types/ia.types';

// ─────────────────────────────────────────────
// SETUP
// ─────────────────────────────────────────────

/** Instancia compartida para todos los tests */
const classifier = new RegexClassifier({ confidenceThreshold: 0.75, sessionTTLMinutes: 5 });

/**
 * Contexto de conversación mínimo para tests.
 */
function makeContext(sessionId = 'test_session'): ConversationContext {
  const now = new Date();
  return {
    sessionId,
    fsmState: 'IDLE',
    history: [],
    createdAt: now,
    expiresAt: new Date(now.getTime() + 5 * 60 * 1000),
  };
}

// ─────────────────────────────────────────────
// RUNNER DE TESTS MANUAL (sin Jest)
// ─────────────────────────────────────────────

let passed = 0;
let failed = 0;

async function test(name: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ ${name}`);
    console.error(`     ${(err as Error).message}`);
    failed++;
  }
}

function expect<T>(actual: T) {
  return {
    toBe(expected: T) {
      if (actual !== expected) {
        throw new Error(`Expected "${expected}", got "${actual}"`);
      }
    },
    toBeGreaterThanOrEqual(min: number) {
      if ((actual as number) < min) {
        throw new Error(`Expected >= ${min}, got ${actual}`);
      }
    },
    toBeLessThan(max: number) {
      if ((actual as number) >= max) {
        throw new Error(`Expected < ${max}, got ${actual}`);
      }
    },
    toContain(substr: string) {
      if (!(actual as string).includes(substr)) {
        throw new Error(`Expected "${actual}" to contain "${substr}"`);
      }
    },
    toBeTruthy() {
      if (!actual) throw new Error(`Expected truthy, got "${actual}"`);
    },
    toBeFalsy() {
      if (actual) throw new Error(`Expected falsy, got "${actual}"`);
    },
    toHaveProperty(key: string) {
      if (!(key in (actual as object))) {
        throw new Error(`Expected object to have property "${key}"`);
      }
    },
    toBeNull() {
      if (actual !== null) throw new Error(`Expected null, got "${actual}"`);
    },
  };
}

// ─────────────────────────────────────────────
// SUITE 1: Clasificación de Intenciones
// ─────────────────────────────────────────────

async function suiteClasificacion() {
  console.log('\n📋 Suite 1: Clasificación de Intenciones\n');

  await test('Clasifica "hola" como saludo con alta confianza', async () => {
    const result = await classifier.classifyIntent('hola');
    expect(result.intent).toBe('saludo');
    expect(result.confidence).toBeGreaterThanOrEqual(0.75);
  });

  await test('Clasifica consulta de talla correctamente', async () => {
    const result = await classifier.classifyIntent('¿tienen la sandalia en talla 38?');
    expect(result.intent).toBe('consulta_talla');
    expect(result.confidence).toBeGreaterThanOrEqual(0.65);
  });

  await test('Clasifica pregunta de pago con Nequi', async () => {
    const result = await classifier.classifyIntent('¿puedo pagar con nequi?');
    expect(result.intent).toBe('faq_pago');
    expect(result.confidence).toBeGreaterThanOrEqual(0.65);
  });

  await test('Clasifica pregunta de envío', async () => {
    const result = await classifier.classifyIntent('¿hacen envíos a Bogotá?');
    expect(result.intent).toBe('faq_envio');
    expect(result.confidence).toBeGreaterThanOrEqual(0.65);
  });

  await test('Clasifica estado de pedido', async () => {
    const result = await classifier.classifyIntent('¿dónde está mi pedido HC-1234?');
    expect(result.intent).toBe('estado_pedido');
    expect(result.confidence).toBeGreaterThanOrEqual(0.65);
  });

  await test('Clasifica queja con alta confianza', async () => {
    const result = await classifier.classifyIntent('esto es un pésimo servicio');
    expect(result.intent).toBe('quejar');
    expect(result.confidence).toBeGreaterThanOrEqual(0.75);
  });

  await test('Clasifica solicitud de agente humano', async () => {
    const result = await classifier.classifyIntent('quiero hablar con un asesor');
    expect(result.intent).toBe('hablar_humano');
    expect(result.confidence).toBeGreaterThanOrEqual(0.75);
  });

  await test('Clasifica despedida', async () => {
    const result = await classifier.classifyIntent('gracias, hasta luego');
    expect(result.intent).toBe('despedida');
    expect(result.confidence).toBeGreaterThanOrEqual(0.65);
  });

  await test('Clasifica texto sin sentido como "otro" con baja confianza', async () => {
    const result = await classifier.classifyIntent('xkdksj alksjd');
    expect(result.intent).toBe('otro');
    expect(result.confidence).toBeLessThan(0.50);
  });

  await test('Retorna IntentResult con structure correcta', async () => {
    const result = await classifier.classifyIntent('hola buenas tardes');
    expect(result).toHaveProperty('intent');
    expect(result).toHaveProperty('confidence');
    expect(result).toHaveProperty('entities');
  });
}

// ─────────────────────────────────────────────
// SUITE 2: Extracción de Entidades
// ─────────────────────────────────────────────

async function suiteEntidades() {
  console.log('\n🔍 Suite 2: Extracción de Entidades\n');

  await test('Extrae talla del mensaje', async () => {
    const result = await classifier.classifyIntent('¿tienen las botas en talla 39?');
    expect(result.entities['talla']).toBe('39');
  });

  await test('Extrae ciudad del mensaje', async () => {
    const result = await classifier.classifyIntent('envíos a Bogotá cuánto demoran');
    // trim() por si el regex captura espacio líder en el patrón de ciudad
    expect(result.entities['ciudad']?.trim().toLowerCase()).toBe('bogotá');
  });

  await test('Extrae número de pedido en formato HC-XXXX', async () => {
    const result = await classifier.classifyIntent('mi pedido HC-5678 no ha llegado');
    expect(result.entities['numeroPedido']).toBe('HC-5678');
  });

  await test('Extrae color del calzado', async () => {
    const result = await classifier.classifyIntent('quiero las sandalias rosadas');
    expect(result.entities['color']?.toLowerCase()).toBe('rosadas');
  });

  await test('Extrae tipo de calzado', async () => {
    const result = await classifier.classifyIntent('tienen botas de cuero');
    expect(result.entities['tipoCalzado']?.toLowerCase()).toBe('botas');
  });

  await test('Retorna null para entidades no presentes', async () => {
    const result = await classifier.classifyIntent('hola buenas');
    expect(result.entities['numeroPedido']).toBeNull();
  });
}

// ─────────────────────────────────────────────
// SUITE 3: Generación de Respuestas
// ─────────────────────────────────────────────

async function suiteRespuestas() {
  console.log('\n💬 Suite 3: Generación de Respuestas\n');

  await test('Respuesta de faq_pago contiene métodos de pago', async () => {
    const ctx = makeContext();
    const response = await classifier.generateResponse('faq_pago', ctx);
    expect(response.text).toContain('Nequi');
    expect(response.text).toContain('Daviplata');
    expect(response.text).toContain('Contraentrega');
  });

  await test('Respuesta de faq_envio contiene tiempos de entrega', async () => {
    const ctx = makeContext();
    const response = await classifier.generateResponse('faq_envio', ctx);
    expect(response.text).toContain('días hábiles');
    expect(response.text).toContain('Bucaramanga');
  });

  await test('Respuesta de consulta_talla contiene tallas disponibles', async () => {
    const ctx = makeContext();
    const response = await classifier.generateResponse('consulta_talla', ctx);
    expect(response.text).toContain('35');
  });

  await test('Respuesta de saludo tiene botones de acción', async () => {
    const ctx = makeContext();
    const response = await classifier.generateResponse('saludo', ctx);
    expect(response.buttons?.length).toBeGreaterThanOrEqual(1);
  });

  await test('Respuesta de quejar tiene requiresHandoff=true', async () => {
    const ctx = makeContext();
    const response = await classifier.generateResponse('quejar', ctx);
    expect(response.requiresHandoff).toBeTruthy();
  });

  await test('Respuesta de hablar_humano tiene requiresHandoff=true', async () => {
    const ctx = makeContext();
    const response = await classifier.generateResponse('hablar_humano', ctx);
    expect(response.requiresHandoff).toBeTruthy();
  });

  await test('Respuesta de intent desconocido usa fallback', async () => {
    const ctx = makeContext();
    const response = await classifier.generateResponse('intent_inventado', ctx);
    expect(response.text).toBeTruthy();
  });
}

// ─────────────────────────────────────────────
// SUITE 4: Gestión de Sesiones
// ─────────────────────────────────────────────

async function suiteSesiones() {
  console.log('\n🔑 Suite 4: Gestión de Sesiones\n');

  await test('Crea sesión exitosamente', async () => {
    const result = await classifier.manageSession('sess_test_001', 'create');
    expect(result.success).toBeTruthy();
    expect(result.sessionId).toBe('sess_test_001');
    expect(result.context).toHaveProperty('fsmStep');
  });

  await test('Recupera sesión existente', async () => {
    await classifier.manageSession('sess_test_002', 'create');
    const result = await classifier.manageSession('sess_test_002', 'get');
    expect(result.success).toBeTruthy();
    expect(result.context?.sessionId).toBe('sess_test_002');
  });

  await test('Retorna false para sesión inexistente', async () => {
    const result = await classifier.manageSession('sess_inexistente_999', 'get');
    expect(result.success).toBeFalsy();
  });

  await test('Expira sesión correctamente', async () => {
    await classifier.manageSession('sess_test_expire', 'create');
    const expireResult = await classifier.manageSession('sess_test_expire', 'expire');
    expect(expireResult.success).toBeTruthy();

    const getResult = await classifier.manageSession('sess_test_expire', 'get');
    expect(getResult.success).toBeFalsy();
  });
}

// ─────────────────────────────────────────────
// PUNTO DE ENTRADA
// ─────────────────────────────────────────────

async function runAllTests() {
  console.log('🧪 HalleyCol — Tests del Módulo IA (RegexClassifier v1.0.0)');
  console.log('═'.repeat(60));

  await suiteClasificacion();
  await suiteEntidades();
  await suiteRespuestas();
  await suiteSesiones();

  console.log('\n' + '═'.repeat(60));
  console.log(`\n📊 Resultado: ${passed} passed · ${failed} failed\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runAllTests().catch(console.error);
