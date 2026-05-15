/**
 * @file index.ts
 * @description Punto de entrada del módulo IA de HalleyCol.
 * Exporta todos los servicios, interfaces, tipos y utilidades.
 * También expone una fábrica (Factory Pattern) para crear la instancia
 * correcta de IAService según la variable de entorno AI_ENGINE.
 * @module ia
 * @version 1.0.0
 *
 * @example
 * // Importar el engine activo sin conocer la implementación concreta:
 * import { createIAService } from './src/ia';
 * const aiService = createIAService();
 * const result = await aiService.classifyIntent('hola, quiero ver botas');
 */

// ─────────────────────────────────────────────
// INTERFACES
// ─────────────────────────────────────────────

export type { IAService } from './interfaces/IAService.interface';

// ─────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────

export type {
  Message,
  IntentResult,
  KnownIntent,
  ConversationContext,
  ResponseMessage,
  HandoffEvent,
  HandoffReason,
  SessionAction,
  SessionResult,
  IALog,
  AIEngine,
  IAConfig,
} from './types/ia.types';

// ─────────────────────────────────────────────
// SERVICIOS
// ─────────────────────────────────────────────

export { RegexClassifier } from './services/RegexClassifier.service';
export type { RegexClassifierConfig } from './services/RegexClassifier.service';

export { GeminiClassifier } from './services/GeminiClassifier.service';
export type { GeminiClassifierConfig } from './services/GeminiClassifier.service';

export { ConversationContextService } from './services/ConversationContext.service';

// ─────────────────────────────────────────────
// ESTRATEGIAS
// ─────────────────────────────────────────────

export { IntentClassificationStrategy } from './strategies/IntentClassification.strategy';
export type {
  StrategyConfig,
  HandoffCallback,
} from './strategies/IntentClassification.strategy';

// ─────────────────────────────────────────────
// UTILIDADES
// ─────────────────────────────────────────────

export { intentPatterns, frustrationTriggers, humanRequestPhrases } from './utils/intent-dictionary';
export type { IntentPattern } from './utils/intent-dictionary';

export { entityPatterns, extractEntities, extractAllMatches } from './utils/regex-patterns';

export { responseTemplates, handoffTemplate, interpolate, businessConfig } from './utils/response-templates';
export type { ResponseTemplate } from './utils/response-templates';

export { IALogger, iaLogger } from './utils/IALogger';
export type { IALoggerConfig, LogDestination } from './utils/IALogger';

// ─────────────────────────────────────────────
// FACTORY (Patrón Fábrica)
// ─────────────────────────────────────────────

import { IAService } from './interfaces/IAService.interface';
import { RegexClassifier } from './services/RegexClassifier.service';
import { GeminiClassifier } from './services/GeminiClassifier.service';
import { AIEngine, IAConfig } from './types/ia.types';

/**
 * Fábrica de motores IA.
 *
 * Lee la configuración desde variables de entorno y retorna
 * la implementación concreta de IAService correcta.
 * El resto del sistema no necesita saber qué engine está activo.
 *
 * Variables de entorno:
 * - `AI_ENGINE`              : 'regex' | 'gemini'   (default: 'regex')
 * - `IA_CONFIDENCE_THRESHOLD`: número entre 0 y 1   (default: 0.75)
 * - `SESSION_TTL_MINUTES`    : minutos              (default: 5)
 *
 * @param overrideConfig - Configuración que sobreescribe las variables de entorno
 * @returns Instancia concreta de IAService lista para usar
 *
 * @example
 * // Usa AI_ENGINE del entorno automáticamente:
 * const aiService = createIAService();
 *
 * // Forzar un engine específico:
 * const regexService = createIAService({ engine: 'regex' });
 */
export function createIAService(overrideConfig: Partial<IAConfig> = {}): IAService {
  const config: IAConfig = {
    engine: (overrideConfig.engine
      ?? (process.env['AI_ENGINE'] as AIEngine)
      ?? 'regex'),
    confidenceThreshold:
      overrideConfig.confidenceThreshold
      ?? parseFloat(process.env['IA_CONFIDENCE_THRESHOLD'] ?? '0.75'),
    sessionTTLMinutes:
      overrideConfig.sessionTTLMinutes
      ?? parseInt(process.env['SESSION_TTL_MINUTES'] ?? '5', 10),
  };

  console.log(
    `[IAFactory] 🤖 Iniciando motor IA: ${config.engine.toUpperCase()} ` +
      `| Umbral: ${config.confidenceThreshold} ` +
      `| TTL sesión: ${config.sessionTTLMinutes}min`
  );

  switch (config.engine) {
    case 'gemini':
      return new GeminiClassifier({
        umbralConfianza: config.confidenceThreshold,
        apiKey: process.env['GEMINI_API_KEY'],
      });

    case 'regex':
    default:
      return new RegexClassifier({
        confidenceThreshold: config.confidenceThreshold,
        sessionTTLMinutes: config.sessionTTLMinutes,
      });
  }
}
