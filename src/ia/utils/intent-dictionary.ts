/**
 * @file intent-dictionary.ts
 * @description Diccionario de palabras clave e intenciones del dominio HalleyCol.
 * Fuente de verdad para el RegexClassifier. Cada intención tiene keywords,
 * un regex ponderado y un peso base de confianza.
 * @module ia/utils
 * @version 1.0.0
 */

import { KnownIntent } from '../types/ia.types';

/**
 * Estructura de un patrón de intención.
 */
export interface IntentPattern {
  /** Lista de palabras clave que activan la intención */
  keywords: string[];
  /** Regex principal para coincidencia de alta confianza */
  regex: RegExp;
  /** Peso base de confianza cuando el regex hace match (0–1) */
  weight: number;
  /** Peso reducido cuando solo hacen match las keywords (0–1) */
  keywordWeight: number;
}

/**
 * Diccionario completo de patrones por intención.
 * Para agregar una nueva intención: añade una entrada con keywords + regex + weight.
 */
export const intentPatterns: Record<KnownIntent, IntentPattern> = {
  // ─────────── CATEGORÍAS Y TALLAS ───────────
  consulta_categoria: {
    keywords: ['tenis', 'botas', 'sandalias', 'tacones', 'mocasines', 'zapatos', 'botines'],
    regex: /(tienen|busco|quiero|venden|hay|ver|muestrame)\s*(tennis|tenis|botas|sandalias|tacones|mocasines|zapatos|botines)/i,
    weight: 0.89,
    keywordWeight: 0.70,
  },
  consulta_talla: {
    keywords: [
      'talla', 'medida', 'número', 'numeros', 'cuánto mide',
      'cuanto mide', 'tallas disponibles', 'qué tallas', 'que tallas',
      '35', '36', '37', '38', '39', '40', '41',
    ],
    regex: /(talla|medida|número|numeros?|en|la)?\s*(3[4-9]|4[0-3])|(talla|medida|número|numeros?)\s*(disponible|tienen|hay|manejan|venden)?/i,
    weight: 0.95,
    keywordWeight: 0.65,
  },

  // ─────────── PEDIDOS ───────────
  estado_pedido: {
    keywords: [
      'pedido', 'orden', 'compra', 'dónde está', 'donde esta',
      'tracking', 'rastreo', 'cuándo llega', 'cuando llega',
      'mi pedido', 'lo que compré', 'entrega',
    ],
    regex: /(pedido|orden|compra)\s*(dónde|donde|estado|llegó|lleva|llegar|va)/i,
    weight: 0.90,
    keywordWeight: 0.70,
  },

  // ─────────── PAGOS ───────────
  faq_pago: {
    keywords: [
      'pago', 'pagar', 'nequi', 'daviplata', 'transferencia',
      'efectivo', 'contraentrega', 'tarjeta', 'método de pago',
      'metodo de pago', 'forma de pago', 'cómo pago', 'como pago',
      'acepta', 'aceptan',
    ],
    regex: /(pago|pagar|método|metodo|forma|aceptan?)\s*(pago|de pago|pagos?|con)?/i,
    weight: 0.85,
    keywordWeight: 0.68,
  },

  // ─────────── ENVÍOS ───────────
  faq_envio: {
    keywords: [
      'envío', 'envio', 'enviar', 'despacho', 'despachan',
      'tiempo de entrega', 'cuánto tarda', 'cuanto tarda',
      'ciudad', 'ciudades', 'costo de envío', 'domicilio',
      'llega a', 'mandan a', 'bucaramanga', 'bogotá', 'medellín',
    ],
    regex: /(envío|envio|enviar|despacho|entrega)\s*(a|cuánto|cuanto|tiempo|ciudades?|costo)?/i,
    weight: 0.85,
    keywordWeight: 0.68,
  },

  // ─────────── QUEJAS ───────────
  quejar: {
    keywords: [
      'queja', 'reclamo', 'mal servicio', 'pésimo', 'pesimo',
      'nunca llega', 'no funciona', 'problema', 'defectuoso',
      'roto', 'devolución', 'devolucion', 'reembolso',
      'estafa', 'engaño', 'mentira',
    ],
    regex: /(queja|reclamo|mal\s+servicio|pésimo|pesimo|nunca\s+llega|defecto|devolución)/i,
    weight: 0.92,
    keywordWeight: 0.75,
  },

  // ─────────── HABLAR CON HUMANO ───────────
  hablar_humano: {
    keywords: [
      'hablar con', 'asesor', 'agente', 'persona', 'humano',
      'atención personalizada', 'representante', 'quiero hablar',
      'comunicarme con', 'necesito ayuda de', 'operador',
    ],
    regex: /(hablar\s+con|quiero\s+hablar|asesor|agente|persona|humano|operador)/i,
    weight: 0.95,
    keywordWeight: 0.80,
  },

  // ─────────── SALUDOS ───────────
  saludo: {
    keywords: [
      'hola', 'buenas', 'buenos días', 'buenos dias',
      'buenas tardes', 'buenas noches', 'hey', 'hi', 'hello',
      'saludos', 'qué tal', 'que tal',
    ],
    regex: /^(hola|buenas|buenos\s+días|buenos\s+dias|hey|hi|hello|saludos)/i,
    weight: 0.95,
    keywordWeight: 0.80,
  },

  // ─────────── DESPEDIDAS ───────────
  despedida: {
    keywords: [
      'adiós', 'adios', 'hasta luego', 'bye', 'chao', 'chau',
      'gracias', 'muchas gracias', 'listo', 'ya fue', 'eso es todo',
    ],
    regex: /(adiós|adios|hasta\s+luego|bye|chao|chau|gracias|eso\s+es\s+todo)/i,
    weight: 0.90,
    keywordWeight: 0.72,
  },

  // ─────────── CATÁLOGO ───────────
  ver_catalogo: {
    keywords: [
      'catálogo', 'catalogo', 'ver catálogo', 'ver catalogo', 'productos',
      'zapatos', 'botas', 'modelos', 'comprar', 'muestrame',
      'que tienen', 'qué tienes', 'colección'
    ],
    regex: /(catálogo|catalogo|productos|zapatos|modelos?|colección|coleccion|muestrame|ver)/i,
    weight: 0.95,
    keywordWeight: 0.80,
  },

  // ─────────── FSM COMPRAS ───────────
  seleccionar_producto: {
    keywords: ['quiero', 'comprar', 'me gustan', 'las', 'los', 'un', 'una', 'dame', 'llevo', 'air max', 'ultraboost', 'suede', 'classic'],
    regex: /(quiero|comprar|me gustan|dame|llevo)\s*(las|los|unas?|unos?)?\s*(air max|ultraboost|suede|classic|1460|arizona|ankle|classics|air force|old skool|chuck taylor|clog|stessy|botines)/i,
    weight: 0.95,
    keywordWeight: 0.85,
  },
  informar_talla: {
    keywords: ['soy', 'talla', 'numero', '35', '36', '37', '38', '39', '40'],
    regex: /(?:soy|talla|numero|en|la)?\s*(3[4-9]|4[0-2])/i,
    weight: 0.9,
    keywordWeight: 0.7,
  },
  informar_ciudad: {
    keywords: ['estoy en', 'vivo en', 'para', 'bogota', 'medellin', 'cali', 'bucaramanga', 'barranquilla'],
    regex: /(?:estoy en|vivo en|para|a)?\s*(bogot[aá]|medell[ií]n|cali|bucaramanga|barranquilla|cartagena|c[uú]cuta)/i,
    weight: 0.9,
    keywordWeight: 0.7,
  },
  informar_pago: {
    keywords: ['con', 'pago', 'nequi', 'daviplata', 'efectivo', 'contraentrega', 'tarjeta'],
    regex: /(?:con|pago|en)?\s*(nequi|daviplata|efectivo|contra\s*entrega|tarjeta)/i,
    weight: 0.9,
    keywordWeight: 0.7,
  },
  confirmar_pedido: {
    keywords: ['confirmar pedido', 'si quiero', 'procesar orden', 'comprar eso'],
    regex: /(confirmar|procesar)\s+(pedido|orden|compra)|si\s+quiero/i,
    weight: 0.95,
    keywordWeight: 0.8,
  },

  // ─────────── FALLBACK ───────────
  otro: {
    keywords: [],
    regex: /.*/,
    weight: 0.30,
    keywordWeight: 0.10,
  },
};

/**
 * Palabras que indican frustración del cliente.
 * Si se detectan, se dispara handoff automático.
 */
export const frustrationTriggers: string[] = [
  'no funciona', 'pésimo', 'pesimo', 'terrible', 'horrible',
  'mal servicio', 'nunca llega', 'estafa', 'engaño', 'mentira',
  'devolución', 'devolucion', 'reembolso', 'harto', 'cansado',
  'absurdo', 'inaceptable', 'ridículo', 'ridiculo',
];

/**
 * Frases que indican solicitud explícita de hablar con humano.
 */
export const humanRequestPhrases: string[] = [
  'hablar con una persona', 'hablar con un asesor', 'quiero un humano',
  'necesito hablar con alguien', 'que me llame alguien', 'asesor por favor',
  'agente real', 'persona real', 'no quiero hablar con un bot',
];

/**
 * Palabras clave del dominio HalleyCol (calzado, tienda, envíos, pagos).
 * Si el texto NO contiene ninguna de estas palabras, se considera fuera de dominio.
 */
export const domainKeywords: string[] = [
  // Calzado y productos
  'zapato', 'zapatilla', 'tenis', 'bota', 'bota', 'tacón', 'taco', 'tacos', 'tacones',
  'sandalias', 'mocasín', 'mocasines', 'botines', 'calzado', 'zapatillas', 'suela',
  'talla', 'número', 'medida', 'color', 'modelo', 'marca', 'nike', 'adidas', 'crocs',
  'ugg', 'birkenstock', 'vans', 'converse', 'dr martens', 'air max', 'ultraboost',
  'classic', 'suede', '1460', 'arizona', 'ankle', 'classics', 'air force', 'old skool',
  'chuck taylor', 'clog', 'stessy',

  // Compras y pedidos
  'comprar', 'precio', 'valor', 'costo', 'cuánto', 'cuanto', 'pedido', 'orden', 'compra',
  'catálogo', 'catalogo', 'productos', 'colección', 'coleccion', 'tienda', 'inventario',
  'disponible', 'stock', 'existen', 'tienen', 'hay', 'ver', 'mostrar', 'quiero', 'llevo',

  // Pagos
  'pago', 'pagar', 'nequi', 'daviplata', 'transferencia', 'efectivo', 'contraentrega',
  'contra entrega', 'tarjeta', 'débito', 'debito', 'crédito', 'credito', 'comprobante',
  'recibo', 'consignar', 'consignación', 'cuenta', 'breb',

  // Envíos y ubicación
  'envío', 'envio', 'despacho', 'domicilio', 'rastreo', 'tracking', 'guía', 'guia',
  'ciudad', 'dirección', 'direccion', 'barrio', 'departamento', 'país', 'pais',
  'bucaramanga', 'bogotá', 'bogota', 'medellín', 'medellin', 'cali', 'barranquilla',
  'cartagena', 'giron', 'girón', 'floridablanca', 'piedecuesta', 'lebrija',

  // Servicio al cliente
  'asesor', 'ayuda', 'servicio', 'atención', 'humano', 'persona', 'agente', 'bot',
  'chat', 'mensaje', 'responder', 'consulta', 'pregunta', 'información', 'info',

  // Estados y condiciones
  'nuevo', 'usado', 'original', 'garantía', 'garantia', 'devolución', 'devolucion',
  'reembolso', 'cambio', 'reclamo', 'queja', 'felicitaciones', 'recomendación',
];

/**
 * Verifica si un texto está relacionado con el dominio de HalleyCol.
 * @param text - Texto del usuario (sin normalizar)
 * @returns true si el texto parece relacionado con calzado/tienda, false si es fuera de dominio
 */
export function isDomainRelated(text: string): boolean {
  const normalized = text.toLowerCase();

  // Verificar si contiene alguna palabra clave del dominio
  return domainKeywords.some(keyword => normalized.includes(keyword.toLowerCase()));
}
