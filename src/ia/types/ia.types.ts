/**
 * @file ia.types.ts
 * @description Tipos e interfaces centrales del módulo de Inteligencia Artificial de HalleyCol.
 * Todos los contratos de datos del sistema IA están definidos aquí.
 * @module ia/types
 * @version 1.0.0
 */

// ─────────────────────────────────────────────
// MENSAJES Y COMUNICACIÓN
// ─────────────────────────────────────────────

/**
 * Representa un mensaje dentro de una conversación.
 */
export interface Message {
  /** Identificador del remitente ('user' | 'bot' | 'agent') */
  from: string;
  /** Contenido textual del mensaje */
  text: string;
  /** Fecha y hora exacta del mensaje */
  timestamp: Date;
  /** Identificador único de la sesión asociada */
  sessionId: string;
}

/**
 * Respuesta generada por el motor IA para enviar al cliente.
 */
export interface ResponseMessage {
  /** Texto principal de la respuesta */
  text: string;
  /** Botones de acción rápida opcionales */
  buttons?: string[];
  /** Indica si la conversación debe derivarse a un agente humano */
  requiresHandoff?: boolean;
}

// ─────────────────────────────────────────────
// CLASIFICACIÓN DE INTENCIONES
// ─────────────────────────────────────────────

/**
 * Resultado de clasificar la intención de un mensaje de usuario.
 */
export interface IntentResult {
  /** Intención detectada (ej: 'consulta_talla', 'faq_pago') */
  intent: string;
  /** Puntuación de confianza entre 0 y 1 */
  confidence: number;
  /** Entidades extraídas del texto (ej: talla, producto, ciudad) */
  entities: Record<string, any>;
  /** The raw text sent by the user */
  rawText?: string;
  /** Response from Gemini fallback when regex confidence is low */
  fallbackResponse?: string;
}

/**
 * Intenciones reconocidas por el sistema.
 * Extiende este tipo al agregar nuevas capacidades.
 */
export type KnownIntent =
  | 'consulta_talla'
  | 'consulta_categoria'
  | 'estado_pedido'
  | 'faq_pago'
  | 'faq_envio'
  | 'quejar'
  | 'hablar_humano'
  | 'saludo'
  | 'despedida'
  | 'ver_catalogo'
  | 'seleccionar_producto'
  | 'informar_talla'
  | 'informar_ciudad'
  | 'informar_pago'
  | 'confirmar_pedido'
  | 'otro';

// ─────────────────────────────────────────────
// CONTEXTO CONVERSACIONAL
// ─────────────────────────────────────────────

/**
 * Contexto activo de una conversación con un cliente.
 * Se almacena en memoria (Map) con TTL de 5 minutos.
 * Preparado para migrar a Redis sin cambiar la interfaz.
 */
export interface ConversationContext {
  /** Identificador único de la sesión */
  sessionId: string;
  /** Última intención detectada en la conversación */
  lastIntent?: string;
  /** Producto mencionado durante la conversación */
  productConsulted?: string;
  /** Talla mencionada por el cliente */
  sizeMentioned?: string;
  
  /** Producto seleccionado del catálogo */
  selectedProduct?: string;
  selectedSize?: string;
  selectedCity?: string;
  selectedPrice?: number;
  selectedPayment?: string;
  receiptImage?: string;
  contactInfo?: string;
  
  /** Paso actual en el flujo de conversación (Finite State Machine) */
  fsmState: 'IDLE' | 'AWAITING_SIZE' | 'AWAITING_CITY' | 'AWAITING_PAYMENT' | 'AWAITING_RECEIPT_AND_CONTACT' | 'AWAITING_CONTACT_INFO';
  /** Historial de intenciones clasificadas en la sesión */
  history: IntentResult[];
  /** Timestamp de creación de la sesión */
  createdAt: Date;
  /** Timestamp de expiración automática */
  expiresAt: Date;
}

// ─────────────────────────────────────────────
// GESTIÓN DE SESIONES
// ─────────────────────────────────────────────

/**
 * Acciones posibles sobre una sesión conversacional.
 */
export type SessionAction = 'create' | 'update' | 'expire' | 'get';

/**
 * Resultado de una operación sobre una sesión.
 */
export interface SessionResult {
  success: boolean;
  sessionId: string;
  context?: ConversationContext;
  message?: string;
}

// ─────────────────────────────────────────────
// HANDOFF (DERIVACIÓN A HUMANO)
// ─────────────────────────────────────────────

/**
 * Evento emitido cuando una conversación debe derivarse
 * a un agente humano en el módulo CRM.
 */
export interface HandoffEvent {
  /** Sesión que originó el handoff */
  sessionId: string;
  /** Razón de la derivación */
  reason: string;
  /** Transcripción completa de la conversación */
  transcript: Message[];
  /** Momento exacto del handoff */
  timestamp: Date;
}

/**
 * Razones codificadas para disparar un handoff.
 */
export type HandoffReason =
  | 'frustracion_detectada'
  | 'confianza_baja'
  | 'solicitud_explicita'
  | 'reintentos_agotados';

// ─────────────────────────────────────────────
// LOGGING Y FINE-TUNING
// ─────────────────────────────────────────────

/**
 * Registro estructurado de cada interacción IA.
 * Usado para análisis y futuro fine-tuning de Gemini.
 */
export interface IALog {
  /** Timestamp de la interacción */
  timestamp: Date;
  /** Sesión asociada */
  sessionId: string;
  /** Mensaje original del usuario */
  mensajeOriginal: string;
  /** Intención clasificada por el motor */
  intencionClasificada: string;
  /** Confianza de la clasificación */
  confidence: number;
  /** Respuesta enviada al cliente */
  respuestaEnviada: string;
  /** Si la consulta fue derivada a agente humano */
  derivadoAHumano: boolean;
  /** Feedback posterior del usuario (si disponible) */
  feedbackUsuario?: 'positivo' | 'negativo' | null;
}

// ─────────────────────────────────────────────
// CONFIGURACIÓN DEL MOTOR IA
// ─────────────────────────────────────────────

/**
 * Motor IA seleccionable según variable de entorno AI_ENGINE.
 */
export type AIEngine = 'regex' | 'gemini';

/**
 * Configuración global del módulo IA.
 * Valores leídos desde variables de entorno.
 */
export interface IAConfig {
  /** Motor activo */
  engine: AIEngine;
  /** Umbral mínimo de confianza para aceptar una clasificación */
  confidenceThreshold: number;
  /** Tiempo de vida de una sesión en minutos */
  sessionTTLMinutes: number;
}
