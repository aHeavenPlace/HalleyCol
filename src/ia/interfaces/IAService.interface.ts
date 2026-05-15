/**
 * @file IAService.interface.ts
 * @description Contrato principal del servicio de Inteligencia Artificial de HalleyCol.
 * Tanto RegexClassifier (v1.0.0) como GeminiClassifier (v1.1.0) implementan esta interfaz,
 * garantizando sustitución sin cambios en el resto del sistema (Principio de Liskov).
 * @module ia/interfaces
 * @version 1.0.0
 */

import {
  ConversationContext,
  IntentResult,
  ResponseMessage,
  SessionAction,
  SessionResult,
} from '../types/ia.types';

/**
 * Interfaz central del motor IA.
 *
 * @example
 * // Cambiar engine sin tocar el resto del sistema:
 * const aiService: IAService = process.env.AI_ENGINE === 'gemini'
 *   ? new GeminiClassifier({ umbralConfianza: 0.75 })
 *   : new RegexClassifier({ confidenceThreshold: 0.75 });
 */
export interface IAService {
  /**
   * Clasifica la intención del mensaje de un cliente.
   *
   * @param text - Mensaje crudo del usuario
   * @param context - Contexto conversacional activo (opcional)
   * @returns Promesa con la intención detectada, confianza y entidades extraídas
   *
   * @example
   * const result = await aiService.classifyIntent(
   *   '¿Tienen la sandalia rosada en talla 37?',
   *   sessionContext
   * );
   * // → { intent: 'consulta_talla', confidence: 0.92, entities: { talla: '37', color: 'rosada' } }
   */
  classifyIntent(
    text: string,
    context?: ConversationContext
  ): Promise<IntentResult>;

  /**
   * Genera la respuesta textual a enviar al cliente según la intención detectada.
   *
   * @param intent - Código de intención (ej: 'faq_pago', 'consulta_talla')
   * @param context - Contexto conversacional activo
   * @returns Promesa con el mensaje de respuesta y botones de acción opcionales
   *
   * @example
   * const response = await aiService.generateResponse('faq_envio', ctx);
   * // → { text: 'Realizamos envíos a...', buttons: ['Hacer pedido'] }
   */
  generateResponse(
    intent: string,
    context: ConversationContext
  ): Promise<ResponseMessage>;

  /**
   * Gestiona el ciclo de vida de una sesión conversacional.
   *
   * @param sessionId - Identificador único de la sesión
   * @param action - Acción a realizar: 'create' | 'update' | 'expire' | 'get'
   * @returns Promesa con el resultado de la operación
   *
   * @example
   * await aiService.manageSession('sess_abc123', 'create');
   * await aiService.manageSession('sess_abc123', 'expire');
   */
  manageSession(
    sessionId: string,
    action: SessionAction
  ): Promise<SessionResult>;
}
