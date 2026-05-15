/**
 * @file IntentClassification.strategy.ts
 * @description Estrategia de clasificación de intenciones con detección de handoff.
 * Implementa el patrón Strategy para intercambiar el motor IA (Regex ↔ Gemini)
 * y centraliza la lógica de derivación a agente humano.
 * @module ia/strategies
 * @version 1.0.0
 */

import { IAService } from '../interfaces/IAService.interface';
import {
  ConversationContext,
  HandoffEvent,
  HandoffReason,
  IntentResult,
  Message,
  ResponseMessage,
} from '../types/ia.types';
import { frustrationTriggers, humanRequestPhrases } from '../utils/intent-dictionary';

/**
 * Callback invocado cuando se detecta una necesidad de handoff.
 */
export type HandoffCallback = (event: HandoffEvent) => void | Promise<void>;

/**
 * Opciones de configuración de la estrategia.
 */
export interface StrategyConfig {
  /** Umbral mínimo de confianza para aceptar una clasificación (default: 0.75) */
  confidenceThreshold: number;
  /** Confianza mínima absoluta — por debajo se fuerza handoff (default: 0.50) */
  minimumConfidence: number;
  /** Máximo de reintentos de bajo confidence antes de handoff (default: 2) */
  maxLowConfidenceRetries: number;
}

/**
 * IntentClassificationStrategy
 *
 * Orquesta la clasificación de intenciones y la detección de situaciones
 * que requieren intervención humana. El motor IA es intercambiable vía
 * inyección de dependencia (cualquier implementación de IAService).
 *
 * @example
 * const strategy = new IntentClassificationStrategy(
 *   regexClassifier,
 *   (event) => crmModule.notifyHandoff(event),
 *   { confidenceThreshold: 0.75 }
 * );
 * const result = await strategy.process(userMessage, context, transcript);
 */
export class IntentClassificationStrategy {
  private readonly engine: IAService;
  private readonly onHandoff: HandoffCallback;
  private readonly config: StrategyConfig;

  /** Contador de clasificaciones con baja confianza por sesión */
  private lowConfidenceCounters: Map<string, number> = new Map();

  /**
   * @param engine - Implementación de IAService (RegexClassifier o GeminiClassifier)
   * @param onHandoff - Función a invocar al detectar handoff
   * @param config - Configuración parcial de umbrales
   */
  constructor(
    engine: IAService,
    onHandoff: HandoffCallback,
    config: Partial<StrategyConfig> = {}
  ) {
    this.engine = engine;
    this.onHandoff = onHandoff;
    this.config = {
      confidenceThreshold: config.confidenceThreshold ?? 0.75,
      minimumConfidence: config.minimumConfidence ?? 0.50,
      maxLowConfidenceRetries: config.maxLowConfidenceRetries ?? 2,
    };
  }

  // ─────────────────────────────────────────────
  // PROCESAMIENTO PRINCIPAL
  // ─────────────────────────────────────────────

  /**
   * Procesa un mensaje del usuario: clasifica la intención, verifica handoff
   * y genera la respuesta apropiada.
   *
   * @param message - Mensaje del usuario a procesar
   * @param context - Contexto conversacional activo
   * @param transcript - Historial completo de mensajes para el evento handoff
   * @returns Respuesta a enviar al cliente e intent clasificado
   */
  public async process(
    message: Message,
    context: ConversationContext,
    transcript: Message[]
  ): Promise<{ response: ResponseMessage; intent: IntentResult }> {
    const text = message.text.trim();

    // 1. Detectar frustración o solicitud explícita antes de clasificar
    const earlyHandoffReason = this.detectEarlyHandoff(text);
    if (earlyHandoffReason) {
      const response = await this.triggerHandoff(
        context.sessionId,
        earlyHandoffReason,
        transcript
      );
      const intentResult: IntentResult = {
        intent: 'hablar_humano',
        confidence: 1.0,
        entities: {},
      };
      return { response, intent: intentResult };
    }

    // 2. Clasificar intención con el motor IA activo
    const intentResult = await this.engine.classifyIntent(text, context);

    // 3. Verificar umbrales de confianza
    const handoffDueToConfidence = this.checkConfidenceThresholds(
      context.sessionId,
      intentResult.confidence
    );

    if (handoffDueToConfidence || intentResult.intent === 'hablar_humano') {
      const reason: HandoffReason =
        intentResult.intent === 'hablar_humano'
          ? 'solicitud_explicita'
          : intentResult.confidence < this.config.minimumConfidence
          ? 'confianza_baja'
          : 'reintentos_agotados';

      const response = await this.triggerHandoff(context.sessionId, reason, transcript);
      return { response, intent: intentResult };
    }

    // 4. Generar respuesta normal
    const response = await this.engine.generateResponse(intentResult.intent, context);
    this.resetLowConfidenceCounter(context.sessionId);

    return { response, intent: intentResult };
  }

  // ─────────────────────────────────────────────
  // DETECCIÓN DE HANDOFF
  // ─────────────────────────────────────────────

  /**
   * Detecta si el texto contiene señales tempranas de handoff
   * (frustración o solicitud explícita de humano).
   *
   * @param text - Mensaje del usuario en minúsculas
   * @returns Razón del handoff o null si no aplica
   */
  private detectEarlyHandoff(text: string): HandoffReason | null {
    const lowerText = text.toLowerCase();

    // Verificar solicitud explícita de humano
    const wantsHuman = humanRequestPhrases.some((phrase) =>
      lowerText.includes(phrase.toLowerCase())
    );
    if (wantsHuman) return 'solicitud_explicita';

    // Verificar palabras de frustración
    const isFrustrated = frustrationTriggers.some((trigger) =>
      lowerText.includes(trigger.toLowerCase())
    );
    if (isFrustrated) return 'frustracion_detectada';

    return null;
  }

  /**
   * Evalúa si la confianza de una clasificación requiere handoff.
   * Incrementa el contador de reintentos por sesión.
   *
   * @param sessionId - Sesión asociada
   * @param confidence - Confianza de la clasificación (0–1)
   * @returns true si se debe hacer handoff
   */
  private checkConfidenceThresholds(sessionId: string, confidence: number): boolean {
    // Confianza por debajo del mínimo absoluto → handoff inmediato
    if (confidence < this.config.minimumConfidence) {
      console.warn(
        `[Strategy] ⚠️  Confianza crítica (${confidence.toFixed(2)}) en sesión: ${sessionId}`
      );
      return true;
    }

    // Confianza entre mínimo y umbral → registrar reintento
    if (confidence < this.config.confidenceThreshold) {
      const count = (this.lowConfidenceCounters.get(sessionId) ?? 0) + 1;
      this.lowConfidenceCounters.set(sessionId, count);
      console.warn(
        `[Strategy] ⚠️  Baja confianza #${count} (${confidence.toFixed(2)}) en sesión: ${sessionId}`
      );

      if (count >= this.config.maxLowConfidenceRetries) {
        return true;
      }
    }

    return false;
  }

  /**
   * Emite el evento HandoffEvent, invoca el callback del CRM
   * y retorna el mensaje de confirmación al cliente.
   *
   * @param sessionId - Sesión que genera el handoff
   * @param reason - Razón codificada del handoff
   * @param transcript - Historial completo de la conversación
   * @returns Mensaje de confirmación para el cliente
   */
  private async triggerHandoff(
    sessionId: string,
    reason: HandoffReason,
    transcript: Message[]
  ): Promise<ResponseMessage> {
    const event: HandoffEvent = {
      sessionId,
      reason,
      transcript,
      timestamp: new Date(),
    };

    console.log(`[Strategy] 🚨 HANDOFF disparado | Sesión: ${sessionId} | Razón: ${reason}`);

    // Notificar al módulo CRM (callback inyectado)
    try {
      await this.onHandoff(event);
    } catch (err) {
      console.error('[Strategy] Error al notificar handoff al CRM:', err);
    }

    this.resetLowConfidenceCounter(sessionId);

    return {
      text:
        '🤝 Entiendo que necesitas atención personalizada.\n\n' +
        'He notificado a nuestro equipo y un asesor te contactará en breve.\n\n' +
        '¿Hay algo más en lo que pueda ayudarte mientras tanto?',
      buttons: ['Sí, tengo otra consulta', 'No, gracias'],
      requiresHandoff: true,
    };
  }

  /**
   * Reinicia el contador de baja confianza para una sesión.
   */
  private resetLowConfidenceCounter(sessionId: string): void {
    this.lowConfidenceCounters.delete(sessionId);
  }
}
