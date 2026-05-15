/**
 * @file IALogger.ts
 * @description Sistema de logging estructurado para el módulo IA de HalleyCol.
 * Registra cada interacción en consola (desarrollo) y prepara la interfaz
 * para persistencia en PostgreSQL (producción).
 * Estos logs son el dataset para fine-tuning futuro de Gemini.
 * @module ia/utils
 * @version 1.0.0
 */

import { IALog } from '../types/ia.types';

/**
 * Destinos de log configurables.
 */
export type LogDestination = 'console' | 'database' | 'both';

/**
 * Configuración del logger.
 */
export interface IALoggerConfig {
  /** Destino de los logs (default: 'console' en desarrollo, 'both' en producción) */
  destination?: LogDestination;
  /** Nivel de verbosidad en consola */
  verbose?: boolean;
}

/**
 * IALogger
 *
 * Registra cada clasificación de intención con todos los datos necesarios
 * para análisis posterior y fine-tuning de Gemini v1.1.0.
 *
 * Estructura de persistencia preparada para tabla PostgreSQL:
 * ```sql
 * CREATE TABLE ia_logs (
 *   id              SERIAL PRIMARY KEY,
 *   timestamp       TIMESTAMPTZ NOT NULL,
 *   session_id      VARCHAR(128) NOT NULL,
 *   mensaje_original TEXT NOT NULL,
 *   intencion       VARCHAR(64) NOT NULL,
 *   confidence      NUMERIC(5,4) NOT NULL,
 *   respuesta       TEXT NOT NULL,
 *   derivado_humano BOOLEAN DEFAULT FALSE,
 *   feedback        VARCHAR(16),
 *   created_at      TIMESTAMPTZ DEFAULT NOW()
 * );
 * ```
 *
 * @example
 * const logger = new IALogger({ destination: 'console', verbose: true });
 * await logger.log({
 *   timestamp: new Date(),
 *   sessionId: 'sess_001',
 *   mensajeOriginal: 'quiero pagar con nequi',
 *   intencionClasificada: 'faq_pago',
 *   confidence: 0.85,
 *   respuestaEnviada: 'Aceptamos...',
 *   derivadoAHumano: false,
 * });
 */
export class IALogger {
  private readonly destination: LogDestination;
  private readonly verbose: boolean;

  constructor(config: IALoggerConfig = {}) {
    this.destination = config.destination
      ?? (process.env['NODE_ENV'] === 'production' ? 'both' : 'console');
    this.verbose = config.verbose ?? (process.env['NODE_ENV'] !== 'production');
  }

  // ─────────────────────────────────────────────
  // API PÚBLICA
  // ─────────────────────────────────────────────

  /**
   * Registra una interacción completa del chatbot.
   *
   * @param entry - Datos completos de la interacción a registrar
   */
  async log(entry: IALog): Promise<void> {
    if (this.destination === 'console' || this.destination === 'both') {
      this.logToConsole(entry);
    }

    if (this.destination === 'database' || this.destination === 'both') {
      await this.logToDatabase(entry);
    }
  }

  /**
   * Registra el feedback del usuario sobre una respuesta anterior.
   * Actualiza el campo feedbackUsuario del log correspondiente.
   *
   * @param sessionId - Sesión de la interacción a actualizar
   * @param feedback - 'positivo' o 'negativo'
   * @param timestamp - Timestamp de la interacción original
   */
  async logFeedback(
    sessionId: string,
    feedback: 'positivo' | 'negativo',
    timestamp: Date
  ): Promise<void> {
    console.log(
      `[IALogger] 📊 Feedback registrado | Sesión: ${sessionId} | ` +
        `Feedback: ${feedback} | Timestamp original: ${timestamp.toISOString()}`
    );

    // TODO: En producción, ejecutar UPDATE en PostgreSQL:
    // UPDATE ia_logs SET feedback = $1
    // WHERE session_id = $2 AND timestamp = $3
  }

  /**
   * Registra un evento de handoff.
   *
   * @param sessionId - Sesión que disparó el handoff
   * @param reason - Razón del handoff
   */
  logHandoff(sessionId: string, reason: string): void {
    console.warn(
      `[IALogger] 🚨 HANDOFF | Sesión: ${sessionId} | Razón: ${reason} | ` +
        `Timestamp: ${new Date().toISOString()}`
    );
  }

  // ─────────────────────────────────────────────
  // MÉTODOS PRIVADOS
  // ─────────────────────────────────────────────

  /**
   * Formatea y escribe el log en consola con colores según confidence.
   */
  private logToConsole(entry: IALog): void {
    const pct = (entry.confidence * 100).toFixed(1);
    const confidenceColor = entry.confidence >= 0.75 ? '✅' : '⚠️';
    const handoffFlag = entry.derivadoAHumano ? ' 🚨 HANDOFF' : '';

    console.log(
      `[IALog] ${entry.timestamp.toISOString()} ` +
        `| Sesión: ${entry.sessionId} ` +
        `| Intent: ${entry.intencionClasificada} ` +
        `| ${confidenceColor} ${pct}%${handoffFlag}`
    );

    if (this.verbose) {
      console.log(`  → Mensaje:   "${entry.mensajeOriginal.substring(0, 80)}"`);
      console.log(`  → Respuesta: "${entry.respuestaEnviada.substring(0, 80)}"`);
    }
  }

  /**
   * Persiste el log en PostgreSQL.
   * En v1.0.0 es un stub; en producción usa pg o un ORM.
   *
   * @todo Implementar con el pool de conexiones de PostgreSQL del proyecto
   */
  private async logToDatabase(entry: IALog): Promise<void> {
    // TODO: En producción, integrar con el pool de pg del proyecto:
    //
    // await db.query(
    //   `INSERT INTO ia_logs
    //    (timestamp, session_id, mensaje_original, intencion, confidence,
    //     respuesta, derivado_humano, feedback)
    //    VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    //   [
    //     entry.timestamp, entry.sessionId, entry.mensajeOriginal,
    //     entry.intencionClasificada, entry.confidence, entry.respuestaEnviada,
    //     entry.derivadoAHumano, entry.feedbackUsuario ?? null,
    //   ]
    // );

    // Stub para v1.0.0: simular escritura asíncrona
    await Promise.resolve();
    if (this.verbose) {
      console.log(`[IALogger] 💾 [DB STUB] Log guardado para sesión: ${entry.sessionId}`);
    }
  }
}

/**
 * Instancia singleton del logger para uso global en el módulo IA.
 * Configurada automáticamente según NODE_ENV.
 */
export const iaLogger = new IALogger();
