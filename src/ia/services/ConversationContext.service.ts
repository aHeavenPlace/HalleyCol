/**
 * @file ConversationContext.service.ts
 * @description Gestor de contexto conversacional con TTL configurable.
 * Implementa un store en memoria (Map) con patrón Repository,
 * preparado para migrar a Redis sin cambiar la interfaz.
 * @module ia/services
 * @version 1.0.0
 */

import { ConversationContext, IntentResult } from '../types/ia.types';

/**
 * ConversationContextService
 *
 * Gestiona sesiones conversacionales efímeras en memoria.
 * Cada sesión expira automáticamente tras el TTL configurado.
 *
 * Para migrar a Redis: implementar la misma API pública en
 * `RedisContextRepository` sin cambiar los consumidores.
 *
 * @example
 * const ctxService = new ConversationContextService({ ttlMinutes: 5 });
 * const ctx = ctxService.createSession('sess_001');
 * ctxService.updateContext('sess_001', intentResult);
 */
export class ConversationContextService {
  /** Almacén en memoria: sessionId → ConversationContext */
  private sessions: Map<string, ConversationContext> = new Map();

  /** Handles de timers de expiración por sesión */
  private expiryTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();

  /** Tiempo de vida de una sesión en milisegundos */
  private readonly ttlMs: number;

  /**
   * @param config.ttlMinutes - Minutos de inactividad antes de expirar (default: 5)
   */
  constructor(config: { ttlMinutes?: number } = {}) {
    this.ttlMs = (config.ttlMinutes ?? 5) * 60 * 1000;
  }

  // ─────────────────────────────────────────────
  // CICLO DE VIDA DE SESIÓN
  // ─────────────────────────────────────────────

  /**
   * Crea una nueva sesión conversacional.
   * Si ya existe una sesión con ese ID, la reinicia.
   *
   * @param sessionId - Identificador único de la sesión
   * @returns Contexto recién creado
   */
  public createSession(sessionId: string): ConversationContext {
    // Cancelar timer anterior si existe
    this.clearExpiryTimer(sessionId);

    const now = new Date();
    const context: ConversationContext = {
      sessionId,
      fsmState: 'IDLE',
      history: [],
      createdAt: now,
      expiresAt: new Date(now.getTime() + this.ttlMs),
    };

    this.sessions.set(sessionId, context);
    this.scheduleExpiry(sessionId);

    console.log(`[ConversationContext] ✅ Sesión creada: ${sessionId}`);
    return context;
  }

  /**
   * Recupera el contexto activo de una sesión.
   * Renueva automáticamente el TTL si la sesión está activa.
   *
   * @param sessionId - Identificador de la sesión
   * @returns Contexto activo o null si no existe/expiró
   */
  public getContext(sessionId: string): ConversationContext | null {
    const context = this.sessions.get(sessionId);
    if (!context) return null;

    // Verificar si ya expiró (por si el timer falló)
    if (new Date() > context.expiresAt) {
      this.expireSession(sessionId);
      return null;
    }

    // Renovar TTL (sliding window)
    this.renewExpiry(sessionId, context);
    return context;
  }

  /**
   * Actualiza el contexto con el resultado de una nueva clasificación.
   * Avanza el FSM y registra la intención en el historial.
   *
   * @param sessionId - Identificador de la sesión
   * @param intent - Resultado de clasificación a integrar al contexto
   * @returns Contexto actualizado
   * @throws Error si la sesión no existe
   */
  public updateContext(sessionId: string, intent: IntentResult): ConversationContext {
    const context = this.getContext(sessionId);
    if (!context) {
      throw new Error(`[ConversationContext] Sesión no encontrada: ${sessionId}`);
    }

    context.lastIntent = intent.intent;
    context.history.push(intent);

    // Extraer entidades relevantes del dominio
    if (intent.entities['talla']) {
      context.sizeMentioned = intent.entities['talla'];
    }
    if (intent.entities['tipoCalzado'] || intent.entities['producto']) {
      context.productConsulted = intent.entities['tipoCalzado'] ?? intent.entities['producto'];
    }

    this.sessions.set(sessionId, context);
    return context;
  }

  /**
   * Expira manualmente una sesión y libera recursos.
   *
   * @param sessionId - Sesión a eliminar
   */
  public expireSession(sessionId: string): void {
    this.clearExpiryTimer(sessionId);
    this.sessions.delete(sessionId);
    console.log(`[ConversationContext] 🗑️  Sesión expirada: ${sessionId}`);
  }

  /**
   * Retorna el número de sesiones activas actualmente.
   * Útil para monitoreo y debugging.
   */
  public getActiveSessionCount(): number {
    return this.sessions.size;
  }

  /**
   * Lista todos los session IDs activos.
   * Útil para diagnóstico en desarrollo.
   */
  public getActiveSessions(): string[] {
    return Array.from(this.sessions.keys());
  }

  // ─────────────────────────────────────────────
  // MÉTODOS PRIVADOS (TTL)
  // ─────────────────────────────────────────────

  /**
   * Programa la expiración automática de una sesión.
   */
  private scheduleExpiry(sessionId: string): void {
    const timer = setTimeout(() => {
      this.expireSession(sessionId);
    }, this.ttlMs);

    this.expiryTimers.set(sessionId, timer);
  }

  /**
   * Cancela el timer de expiración existente para una sesión.
   */
  private clearExpiryTimer(sessionId: string): void {
    const existingTimer = this.expiryTimers.get(sessionId);
    if (existingTimer) {
      clearTimeout(existingTimer);
      this.expiryTimers.delete(sessionId);
    }
  }

  /**
   * Renueva el TTL de una sesión (sliding window).
   */
  private renewExpiry(sessionId: string, context: ConversationContext): void {
    this.clearExpiryTimer(sessionId);
    context.expiresAt = new Date(Date.now() + this.ttlMs);
    this.scheduleExpiry(sessionId);
  }
}
