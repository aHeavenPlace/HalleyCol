/**
 * @file response-templates.ts
 * @description Sistema de plantillas dinámicas de respuesta para el chatbot HalleyCol.
 * Cada plantilla tiene texto base con variables interpolables y botones de acción rápida.
 * @module ia/utils
 * @version 1.0.0
 */

import { KnownIntent } from '../types/ia.types';

/**
 * Estructura de una plantilla de respuesta.
 */
export interface ResponseTemplate {
  /** Texto base con variables en formato {variable} */
  base: string;
  /** Botones de acción rápida para el cliente */
  buttons: string[];
  /** Indica si esta respuesta requiere handoff */
  requiresHandoff?: boolean;
}

/**
 * Variables de configuración del negocio HalleyCol.
 * En producción estas vendrán de la base de datos o variables de entorno.
 */
export const businessConfig = {
  numeroNequi: '300 482 1290',
  numeroDaviplata: '312 949 2018',
  llaveBreb: 'HalleyCOL@gmail.com',
  tallasDisponibles: '35, 36, 37, 38, 39, 40',
  ciudadesEnvio: 'todo Colombia vía Coordinadora y Servientrega',
  costoEnvio: 'Gratis en compras mayores a $200.000 · Desde $8.000 en otros pedidos',
  horarioAtencion: 'Lunes a sábado de 8am a 7pm',
  nombreTienda: 'HalleyCol',
};

/**
 * Diccionario de plantillas por intención.
 * Cada clave corresponde a un KnownIntent.
 */
export const responseTemplates: Record<KnownIntent, ResponseTemplate> = {
  // ─────────── CATEGORÍAS Y TALLAS ───────────
  consulta_categoria: {
    base: 'Buscando categorías...', // Esto es reemplazado programáticamente por la lógica del FSM
    buttons: []
  },
  consulta_talla: {
    base:
      '¡Hola! 👟 Manejamos las tallas {tallasDisponibles}.\n\n' +
      '¿Tienes algún modelo en mente? Puedo decirte si está disponible en tu talla. ' +
      'También puedes ver nuestro catálogo completo en línea.',
    buttons: ['Ver catálogo', 'Consultar modelo específico', 'Hablar con asesor'],
  },

  // ─────────── PEDIDOS ───────────
  estado_pedido: {
    base:
      'Con gusto te ayudo con el estado de tu pedido 📦\n\n' +
      'Por favor comparte tu número de pedido (formato HC-XXXX) o el número de rastreo ' +
      'que te enviamos por WhatsApp al realizar tu compra.',
    buttons: ['Tengo mi número de pedido', 'No recuerdo el número', 'Hablar con asesor'],
  },

  // ─────────── PAGOS ───────────
  faq_pago: {
    base:
      '💳 Aceptamos los siguientes métodos de pago:\n\n' +
      '• **Contraentrega** – Pagas al recibir en efectivo\n' +
      '• **Nequi:** {numeroNequi}\n' +
      '• **Daviplata:** {numeroDaviplata}\n' +
      '• **Transferencia bancaria**\n\n' +
      '⚠️ *Nota: Todo pago por un medio diferente a contraentrega será validado brevemente por un humano antes de despachar.*\n\n' +
      '¿Con cuál método te gustaría pagar?',
    buttons: ['Contraentrega', 'Nequi', 'Daviplata', 'Ver catálogo'],
  },

  // ─────────── ENVÍOS ───────────
  faq_envio: {
    base:
      '🚚 Realizamos envíos a {ciudadesEnvio}.\n\n' +
      '**Tiempos estimados:**\n' +
      '• Bucaramanga: 1–2 días hábiles\n' +
      '• Otras ciudades: 3–5 días hábiles\n\n' +
      '**Costo:** {costoEnvio}\n\n' +
      '¿A qué ciudad necesitas el envío?',
    buttons: ['Hacer un pedido', 'Consultar mi ciudad', 'Ver costos detallados'],
  },

  // ─────────── QUEJAS ───────────
  quejar: {
    base:
      'Lamento de verdad la situación 😔. Queremos resolverlo lo antes posible.\n\n' +
      'Por favor, redacta de manera breve el inconveniente que tuviste. Esto se enviará directamente a nuestro sistema interno de CRM y el equipo se contactará contigo enseguida con una solución.\n\n' +
      'Quedo atenta a tus comentarios.',
    buttons: ['Hablar con asesor ahora'],
    requiresHandoff: true,
  },

  // ─────────── HABLAR CON HUMANO ───────────
  hablar_humano: {
    base:
      '¡Por supuesto! 🙋 Con gusto te conecto con uno de nuestros asesores.\n\n' +
      'Nuestro horario de atención es {horarioAtencion}.\n\n' +
      'En un momento alguien estará contigo. ¿Hay algo más en lo que pueda ayudarte mientras esperas?',
    buttons: [],
    requiresHandoff: true,
  },

  // ─────────── SALUDOS ───────────
  saludo: {
    base:
      '¡Hola! 🌸 Bienvenida a {nombreTienda}, tu tienda de calzado femenino favorita en Bucaramanga.\n\n' +
      '¿En qué te puedo ayudar hoy?',
    buttons: ['Ver catálogo', 'Consultar tallas', 'Estado de mi pedido', 'Métodos de pago'],
  },

  // ─────────── DESPEDIDAS ───────────
  despedida: {
    base:
      '¡Fue un placer atenderte! 💕 Esperamos verte pronto en {nombreTienda}.\n\n' +
      'Si necesitas algo más, no dudes en escribirnos. ¡Que tengas un excelente día! ✨',
    buttons: ['Ver nuevas colecciones'],
  },

  // ─────────── CATÁLOGO ───────────
  ver_catalogo: {
    base:
      '¡Claro! 👠 Aquí tienes algunos de nuestros productos estrella de la nueva colección:\n\n' +
      '🥾 **Botas "Diana"** - $145.000\n' +
      '👟 **Tenis "Urban"** - $120.000\n' +
      '👡 **Sandalias "Verano"** - $85.000\n' +
      '👠 **Tacones "Elegance"** - $160.000\n\n' +
      'Dime cuál te gusta (ej: "Quiero las botas Diana") para revisar tallas.',
    buttons: ['Quiero las Diana', 'Quiero los Urban', 'Hablar con asesor'],
  },

  // ─────────── FSM COMPRAS ───────────
  seleccionar_producto: {
    base: 'Has seleccionado un producto del catálogo.\n\n¿Por favor indícame qué modelo y talla buscas?',
    buttons: ['Botas Diana', 'Tenis Urban'],
  },
  informar_talla: {
    base: 'Perfecto, hemos anotado tu talla.\n\nAhora necesitamos tu ciudad para calcular el envío.',
    buttons: ['Bucaramanga', 'Floridablanca', 'Bogotá'],
  },
  informar_ciudad: {
    base: '¡Entendido! Hemos calculado tu envío.\n\nPara despacharlo, necesitamos tu Nombre Completo, Dirección y Celular.',
    buttons: [],
  },
  informar_pago: {
    base: '¡Gracias! Hemos registrado tu método de pago.\n\nPor favor adjunta el comprobante y un asesor aprobará el pedido desde el sistema central.',
    buttons: ['Ver estado de mi pedido'],
  },
  confirmar_pedido: {
    base: 'Procesando confirmación...',
    buttons: []
  },

  // ─────────── FALLBACK ───────────
  otro: {
    base:
      'Hmm, no estoy segura de haber entendido bien tu consulta 🤔\n\n' +
      '¿Podrías darme más detalles? También puedo conectarte con un asesor si lo prefieres.',
    buttons: ['Reformular mi pregunta', 'Hablar con asesor', 'Ver catálogo'],
  },
};

/**
 * Plantilla especial de handoff (derivación a humano).
 * Se usa independientemente de la intención detectada.
 */
export const handoffTemplate: ResponseTemplate = {
  base:
    '🤝 Entiendo que necesitas atención personalizada.\n\n' +
    'He notificado a nuestro equipo y un asesor te contactará en breve.\n\n' +
    '¿Hay algo más en lo que pueda ayudarte mientras tanto?',
  buttons: ['Sí, tengo otra consulta', 'No, gracias'],
  requiresHandoff: true,
};

/**
 * Interpola variables en una plantilla de respuesta.
 * Reemplaza tokens {variable} con valores de businessConfig o variables adicionales.
 *
 * @param template - Plantilla a procesar
 * @param extraVars - Variables adicionales para interpolación (ej: { talla: '38' })
 * @returns Texto con variables reemplazadas
 *
 * @example
 * interpolate(responseTemplates.faq_pago.base, {})
 * // → "💳 Aceptamos... Nequi: 310 XXX XXXX..."
 */
export function interpolate(
  template: string,
  extraVars: Record<string, string> = {}
): string {
  const allVars: Record<string, string> = {
    tallasDisponibles: businessConfig.tallasDisponibles,
    numeroNequi: businessConfig.numeroNequi,
    numeroDaviplata: businessConfig.numeroDaviplata,
    ciudadesEnvio: businessConfig.ciudadesEnvio,
    costoEnvio: businessConfig.costoEnvio,
    horarioAtencion: businessConfig.horarioAtencion,
    nombreTienda: businessConfig.nombreTienda,
    ...extraVars,
  };

  return template.replace(/\{(\w+)\}/g, (_, key) => allVars[key] ?? `{${key}}`);
}
