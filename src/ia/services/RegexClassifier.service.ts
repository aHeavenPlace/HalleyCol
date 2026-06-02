/**
 * @file RegexClassifier.service.ts
 * @description Clasificador de intenciones MVP v1.0.0 basado en regex + diccionario ponderado.
 * Implementa IAService para ser intercambiable con GeminiClassifier (v1.1.0)
 * sin cambios en el resto del sistema.
 * @module ia/services
 * @version 1.0.0
 */

import { IAService } from '../interfaces/IAService.interface';
import {
  ConversationContext,
  IntentResult,
  KnownIntent,
  ResponseMessage,
  SessionAction,
  SessionResult,
} from '../types/ia.types';
import { intentPatterns } from '../utils/intent-dictionary';
import { extractEntities } from '../utils/regex-patterns';
import { interpolate, responseTemplates, businessConfig } from '../utils/response-templates';
import { ConversationContextService } from './ConversationContext.service';
import { GeminiClassifier } from './GeminiClassifier.service';
import { InventoryService } from './Inventory.service';
import { isDomainRelated } from '../utils/intent-dictionary';

/**
 * Configuración del RegexClassifier.
 */
export interface RegexClassifierConfig {
  /** Umbral mínimo de confianza para aceptar clasificación (default: 0.75) */
  confidenceThreshold?: number;
  /** Minutos de vida de cada sesión (default: 5) */
  sessionTTLMinutes?: number;
}

/**
 * RegexClassifier — Motor IA MVP v1.0.0
 *
 * Clasifica intenciones usando:
 * 1. Match de regex principal → confidence = pattern.weight
 * 2. Match de keywords       → confidence = pattern.keywordWeight
 * 3. Sin match               → intent='otro', confidence=0.20
 *
 * Si confidence < confidenceThreshold, la respuesta incluye requiresHandoff=true
 * para que la estrategia tome la decisión de derivar.
 *
 * @example
 * const classifier = new RegexClassifier({ confidenceThreshold: 0.75 });
 * const result = await classifier.classifyIntent('quiero pagar con nequi');
 * // → { intent: 'faq_pago', confidence: 0.85, entities: { ... } }
 */
export class RegexClassifier implements IAService {
  private readonly confidenceThreshold: number;
  private readonly contextService: ConversationContextService;
  private readonly geminiClassifier: GeminiClassifier;
  private readonly inventoryService: InventoryService;

  constructor(config: RegexClassifierConfig = {}) {
    this.confidenceThreshold = config.confidenceThreshold ?? 0.75;
    this.contextService = new ConversationContextService({
      ttlMinutes: config.sessionTTLMinutes ?? 5,
    });
    this.geminiClassifier = new GeminiClassifier();
    this.inventoryService = new InventoryService();
  }

  // ─────────────────────────────────────────────
  // CLASIFICACIÓN DE INTENCIONES
  // ─────────────────────────────────────────────

  /**
   * Clasifica la intención del mensaje usando regex ponderados.
   *
   * Algoritmo:
   * 1. Normalizar texto
   * 2. Para cada intención, evaluar regex y keywords
   * 3. Seleccionar la intención con mayor score
   * 4. Extraer entidades del texto
   *
   * @param text - Mensaje crudo del usuario
   * @param context - Contexto conversacional activo (influye en desambiguación futura)
   * @returns Promesa con el IntentResult clasificado
   */
  async classifyIntent(
    text: string,
    _context?: ConversationContext
  ): Promise<IntentResult> {
    const normalized = this.normalizeText(text);

    // Verificar si el texto está fuera del dominio de Vekas.
    // IMPORTANTE: Si el FSM está en un estado intermedio (esperando ciudad, pago, datos de contacto),
    // saltamos la validación de dominio para no bloquear respuestas válidas del usuario.
    const isInFlow = _context && _context.fsmState !== 'IDLE';
    if (!isInFlow && !isDomainRelated(text)) {
      return {
        intent: 'otro',
        confidence: 1.0,
        entities: {},
        rawText: text,
        fallbackResponse: 'Lo siento, solo puedo responder preguntas relacionadas con Vekas, nuestra tienda de calzado femenino. ¿En qué puedo ayudarte con respecto a nuestros productos, envíos o pagos? 👠',
      };
    }

    let bestIntent: KnownIntent = 'otro';
    let bestConfidence = 0.0;

    const intentsToEvaluate = (
      Object.keys(intentPatterns) as KnownIntent[]
    ).filter((k) => k !== 'otro');

    for (const intentKey of intentsToEvaluate) {
      const pattern = intentPatterns[intentKey];
      const score = this.scoreIntent(normalized, pattern);

      if (score > bestConfidence) {
        bestConfidence = score;
        bestIntent = intentKey;
      }
    }

    // Fallback si ningún intent superó umbral mínimo
    if (bestConfidence < 0.20) {
      bestIntent = 'otro';
      bestConfidence = 0.20;
    }

    const entities = extractEntities(text);

    let fallbackResponse: string | undefined = undefined;

    // Solo llamar a Gemini como fallback si:
    //  - El FSM está en IDLE (no en medio de un flujo de compra)
    //  - La intención es 'otro' o la confianza es muy baja
    // Razón: si el FSM espera talla/ciudad/pago, el texto corto del usuario
    // ("38", "Bogotá", "Nequi") nunca será detectado como "del dominio" por Gemini.
    const fsmIsIdle = !_context || _context.fsmState === 'IDLE';
    if (fsmIsIdle && (bestIntent === 'otro' || bestConfidence < 0.5)) {
      const contextSafe = _context ?? this.contextService.getContext('dummy') ?? {
        sessionId: 'dummy',
        fsmState: 'IDLE',
        history: [],
        createdAt: new Date(),
        expiresAt: new Date()
      };
      try {
        const geminiResp = await this.geminiClassifier.generateResponse(text, contextSafe);
        fallbackResponse = geminiResp.text;
        if (geminiResp.buttons && geminiResp.buttons.length > 0) {
          (entities as any)['geminiButtons'] = geminiResp.buttons;
        }
      } catch (err) {
        console.error('[RegexClassifier] Error calling Gemini fallback:', err);
        fallbackResponse = 'Lo siento, estoy teniendo dificultades técnicas. ¿Podrías intentar de nuevo o hablar con un asesor? 🔧';
      }
    }

    const result: IntentResult = {
      intent: bestIntent,
      confidence: parseFloat(bestConfidence.toFixed(4)),
      entities,
      rawText: text,
      fallbackResponse
    };

    this.logClassification(text, result);
    return result;
  }

  /**
   * Genera la respuesta textual según la intención detectada.
   * Interpola variables de negocio en las plantillas.
   *
   * @param intent - Código de intención
   * @param context - Contexto conversacional (para personalización futura)
   * @returns ResponseMessage con texto y botones
   */
  async generateResponse(
    intent: string,
    context: ConversationContext
  ): Promise<ResponseMessage> {
    const knownIntent = intent as KnownIntent;

    // 0. Si hubo un fallback response desde Gemini
    const lastHistory = context.history.length > 0 ? context.history[0] : null;
    if (lastHistory?.fallbackResponse) {
      return {
        text: lastHistory.fallbackResponse,
        buttons: lastHistory.entities['geminiButtons'] || []
      };
    }

    // 0.5 Interceptar ver_catalogo para hacerlo dinámico
    if (knownIntent === 'ver_catalogo') {
      try {
        const allProducts = await this.inventoryService.getAllProducts();
        const topProducts = allProducts.slice(0, 5);
        const productList = topProducts.map(p => `• **${p.name}** (${p.brand}) — $${p.price.toLocaleString('es-CO')}`).join('\n');

        return {
          text: `¡Claro! 👠 Aquí tienes nuestra colección disponible:\n\n${productList}\n\nDime cuál te gusta para revisar tallas y precio de envío.`,
          buttons: topProducts.map(p => p.name)
        };
      } catch (err) {
        console.error('[RegexClassifier] Error fetching inventory for catalog:', err);
        return { text: 'Lo siento, no puedo acceder al catálogo en este momento. Por favor intenta más tarde.', buttons: ['Hablar con asesor'] };
      }
    }

    // 0.6 Interceptar consulta_talla para hacerlo dinámico
    if (knownIntent === 'consulta_talla' && (context.fsmState === 'IDLE' || context.fsmState === 'AWAITING_SIZE')) {
      const sizeEntity = context.history[0]?.entities['talla'];
      if (!sizeEntity && context.selectedProduct) {
        const allProducts = await this.inventoryService.getAllProducts();
        const product = allProducts.find(p => p.name === context.selectedProduct);
        if (product) {
          context.fsmState = 'AWAITING_SIZE';
          return {
            text: `Para el modelo ${product.name} tenemos disponibles las tallas: ${product.availableSizes.join(', ')}.\n¿Cuál de esas te gustaría llevar?`,
            buttons: product.availableSizes
          };
        }
      }

      // Si veníamos hablando con Gemini y este sugirió ver tallas, dejamos que Gemini responda
      if (context.history.length > 1 && context.history[1].fallbackResponse) {
        const rawText = context.history[0]?.rawText || intent;
        const geminiResp = await this.geminiClassifier.generateResponse(rawText, context);
        return {
          text: geminiResp.text,
          buttons: geminiResp.buttons || []
        };
      }
    }

    // 0.7 Interceptar confirmar_pedido para extraer contexto con Gemini y saltar al FSM de pago
    if (knownIntent === 'confirmar_pedido') {
      // Si el FSM ya tiene producto, simplemente saltamos a pedir ciudad
      if (!context.selectedProduct && context.history.length > 0) {
        try {
          if (!this.geminiClassifier.geminiClient) {
            throw new Error('Gemini client not initialized. GEMINI_API_KEY might be missing.');
          }
          // Extraer detalles del pedido del historial usando Gemini
          const historyText = context.history.map(h => `Usuario: ${h.rawText}\nAsistente: ${h.fallbackResponse || ''}`).join('\n---\n');
          const prompt = `Analiza este historial de conversación y extrae qué productos quiere comprar el usuario y el precio total sumado de esos productos.
Historial:
${historyText}

Devuelve ÚNICAMENTE un objeto JSON. No agregues explicaciones ni formato markdown.
{"product": "Resumen de lo que compra (ej: 12 Crocs Talla 39 y 4 Talla 38)", "totalPrice": 150000}`;

          const extractResult = await this.geminiClassifier.geminiClient.generateContent(prompt);
          const rawExtract = extractResult.response.text().replace(/```json|```/g, '').trim();
          const jsonMatch = rawExtract.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            context.selectedProduct = parsed.product;
            context.selectedPrice = parsed.totalPrice;
          }
        } catch (error) {
          console.error('[RegexClassifier] Error extracting order details with Gemini:', error);
        }
      }

      context.fsmState = 'AWAITING_CITY';
      return {
        text: `¡Perfecto! Vamos a procesar tu orden${context.selectedProduct ? ` por ${context.selectedProduct}` : ''}.\n\nPara calcular el costo de envío y darte el total exacto de tu compra, ¿En qué ciudad te encuentras?`,
        buttons: ['Bogotá', 'Medellín', 'Cali', 'Bucaramanga']
      };
    }

    // 1. Si la intención es quejarse, forzamos la salida del FSM
    if (knownIntent === 'quejar') {
      context.fsmState = 'IDLE';
      const template = responseTemplates['quejar'];
      return { text: template.base, buttons: template.buttons, requiresHandoff: true };
    }

    // 2. FSM LOGIC - Consulta de Categoría
    if (knownIntent === 'consulta_categoria') {
      const rawText = context.history[0]?.rawText || '';

      // Normalizar: "tennis" → "tenis", "tacones" → "tacones", etc.
      const normalize = (s: string) => s.toLowerCase()
        .replace(/tennis/g, 'tenis')
        .replace(/zapatillas?/g, 'tenis');

      const rawNorm = normalize(rawText);
      const categoryMatch = ['tenis', 'botas', 'sandalias', 'tacones', 'mocasines', 'zapatos', 'botines']
        .find(cat => rawNorm.includes(cat)) ?? null;

      if (categoryMatch) {
        const allProducts = await this.inventoryService.getAllProducts();
        const products = allProducts.filter(p => normalize(p.category) === categoryMatch);

        if (products.length > 0) {
          const productList = products.map(p => `• **${p.name}** (${p.brand}) — $${p.price.toLocaleString('es-CO')}`).join('\n');
          context.fsmState = 'IDLE';
          return {
            text: `¡Sí, claro! En la categoría **${categoryMatch}** tenemos disponibles:\n\n${productList}\n\nDime cuál te interesa para mostrarte las tallas.`,
            buttons: products.map(p => p.name)
          };
        }
      }

      // Sin coincidencia de categoría — mostrar catálogo completo
      const allProducts = await this.inventoryService.getAllProducts();
      const productList = allProducts.slice(0, 5).map(p => `• **${p.name}** — $${p.price.toLocaleString('es-CO')}`).join('\n');
      return {
        text: `Aquí tienes nuestro catálogo disponible:\n\n${productList}\n\n¿Cuál te interesa?`,
        buttons: allProducts.slice(0, 4).map(p => p.name)
      };
    }

    // 2.5 FSM LOGIC - Selección de producto
    if (knownIntent === 'seleccionar_producto') {
      const productEntity = context.history[0]?.entities['productoEspecifico'];
      const rawText = context.history[0]?.rawText || '';
      const allProducts = await this.inventoryService.getAllProducts();

      // Buscar producto: primero por entidad extraída, luego por fuzzy match en texto libre
      let product = productEntity
        ? allProducts.find(p =>
            p.name.toLowerCase().includes(productEntity.toLowerCase()) ||
            productEntity.toLowerCase().includes(p.name.toLowerCase()) ||
            p.brand.toLowerCase().includes(productEntity.toLowerCase())
          )
        : undefined;

      // Fallback: buscar cualquier palabra del rawText en nombre o marca del producto
      if (!product && rawText) {
        const rawLower = rawText.toLowerCase();
        product = allProducts.find(p =>
          rawLower.includes(p.name.toLowerCase()) ||
          p.name.split(' ').some(word => word.length > 3 && rawLower.includes(word.toLowerCase())) ||
          rawLower.includes(p.brand.toLowerCase())
        );
      }

      if (product) {
        context.selectedProduct = product.name;
        context.selectedPrice = product.price;
        context.fsmState = 'AWAITING_SIZE';
        return {
          text: `¡Excelente elección! Los/Las **${product.name}** de ${product.brand} cuestan **$${product.price.toLocaleString('es-CO')}**.\n\nTenemos disponibles las siguientes tallas: ${product.availableSizes.join(', ')}.\n\n¿Qué talla buscas?`,
          buttons: product.availableSizes
        };
      }

      // No se identificó producto, mostrar catálogo
      const topProducts = allProducts.slice(0, 4);
      const topNames = topProducts.map(p => p.name);
      return {
        text: `¿Qué modelo de zapato te gustaría llevar? 👠\n\nTenemos varios modelos disponibles:\n${topProducts.map(p => `• **${p.name}** - $${p.price.toLocaleString('es-CO')}`).join('\n')}`,
        buttons: topNames
      };
    }

    // FSM LOGIC - Talla
    if (context.fsmState === 'AWAITING_SIZE') {
      const rawText = context.history[0]?.rawText || '';
      const sizeEntity = context.history[0]?.entities['talla'];
      // Detectar número de talla aunque sea solo (ej: botón "38")
      const plainSizeMatch = rawText.trim().match(/^(3[4-9]|4[0-2])$/);
      const size = sizeEntity || (plainSizeMatch ? plainSizeMatch[1] : null);

      if (size || knownIntent === 'informar_talla') {
        const finalSize = size || rawText.trim() || '38';
        context.selectedSize = finalSize;
        context.fsmState = 'AWAITING_CITY';
        return {
          text: `Perfecto, talla **${finalSize}** anotada. ✅\n\nPara calcular el costo de envío y darte el total exacto de tu compra, ¿en qué ciudad te encuentras?`,
          buttons: ['Bogotá', 'Medellín', 'Cali', 'Bucaramanga', 'Bucaramanga AM']
        };
      }

      // No se detectó talla válida — pedir de nuevo
      if (context.selectedProduct) {
        const allProducts = await this.inventoryService.getAllProducts();
        const product = allProducts.find(p => p.name === context.selectedProduct);
        const sizes = product?.availableSizes ?? ['35', '36', '37', '38', '39', '40'];
        return {
          text: `Mmm, no identifiqué la talla. ¿Cuál de estas tallas necesitas para las **${context.selectedProduct}**?`,
          buttons: sizes
        };
      }
    }

    // FSM LOGIC - Ciudad y Total + Pedir Contacto
    if (context.fsmState === 'AWAITING_CITY') {
      const rawText = context.history[0]?.rawText || intent;
      const cityEntity = context.history[0]?.entities['ciudad'];
      const city = cityEntity || rawText.trim();

      context.selectedCity = city;
      const normalized = city.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // quitar tildes para comparar

      // Tabla de costos de envío por zona
      let shippingCost = 15000; // nacional por defecto
      if (normalized.includes('bucaramanga') || normalized.includes('bga') || normalized.includes('bucara')) {
        // Bucaramanga ciudad: envío más barato
        const isAM = normalized.includes('am') || normalized.includes('area') || normalized.includes('metro');
        shippingCost = isAM ? 12000 : 8000;
      } else if (
        normalized.includes('giron') || normalized.includes('floridablanca') ||
        normalized.includes('piedecuesta') || normalized.includes('lebrija')
      ) {
        shippingCost = 12000; // Área metropolitana de Bucaramanga
      } else if (normalized.includes('bogota') || normalized.includes('bgta')) {
        shippingCost = 14000;
      } else if (normalized.includes('medellin') || normalized.includes('medallo')) {
        shippingCost = 14000;
      } else if (normalized.includes('cali')) {
        shippingCost = 14000;
      }

      const total = (context.selectedPrice || 0) + shippingCost;
      context.fsmState = 'AWAITING_PAYMENT';
      return {
        text: `¡Entendido! 📦 El envío a **${city}** cuesta **$${shippingCost.toLocaleString('es-CO')}**.\n\n💰 **Total de tu compra: $${total.toLocaleString('es-CO')}**\n\n¿Con qué método de pago te gustaría cancelar?`,
        buttons: ['Nequi', 'Daviplata', 'Contra entrega', 'Transferencia']
      };
    }

    // FSM LOGIC - Pago
    if (context.fsmState === 'AWAITING_PAYMENT') {
      const rawText = context.history[0]?.rawText ? String(context.history[0]?.rawText).toLowerCase() : intent.toLowerCase();
      const isNequi = rawText.includes('nequi');
      const isDaviplata = rawText.includes('daviplata') || rawText.includes('favidplata');
      const isBreb = rawText.includes('breb') || rawText.includes('transferencia');
      const isContraentrega = rawText.includes('contra entrega') || rawText.includes('contraentrega') || rawText.includes('efectivo');

      if (isContraentrega) {
        context.selectedPayment = 'Contra entrega';
        context.fsmState = 'AWAITING_CONTACT_INFO';
        return {
          text: `Perfecto, pagas al recibir.\n\nPara despachar tu pedido, por favor dime tu nombre completo, dirección exacta de envío y tu número celular en un solo mensaje, **separados por comas** (ej: Juan Pérez, Calle 1 #2-3, 3001234567):`,
          buttons: []
        };
      } else {
        let account = '';
        if (isNequi) {
          context.selectedPayment = 'Nequi';
          account = `nuestra cuenta **Nequi: ${businessConfig.numeroNequi}**`;
        } else if (isDaviplata) {
          context.selectedPayment = 'Daviplata';
          account = `nuestra cuenta **Daviplata: ${businessConfig.numeroDaviplata}**`;
        } else {
          context.selectedPayment = 'Transferencia';
          account = `nuestra cuenta **BreB/Transferencia: ${businessConfig.llaveBreb}**`;
        }

        context.fsmState = 'AWAITING_RECEIPT_AND_CONTACT';
        return {
          text: `Perfecto. Por favor, transfiere el valor total a ${account}.\n\n📸 **Adjunta aquí la captura de tu comprobante de pago**, y en el mismo mensaje incluye tu nombre completo, dirección exacta de envío y tu número celular, **separados por comas** (ej: Juan Pérez, Calle 1 #2-3, 3001234567):`,
          buttons: []
        };
      }
    }

    // FSM LOGIC - Contacto (Para Contraentrega)
    if (context.fsmState === 'AWAITING_CONTACT_INFO') {
      const rawText = context.history[0]?.rawText || intent;
      context.contactInfo = rawText;
      context.fsmState = 'IDLE'; // Cierra la orden
      return {
        text: `¡Tus datos han sido registrados!\n\nHemos creado tu orden de ${context.selectedProduct} (Talla ${context.selectedSize}) para envío a ${context.selectedCity}.\n\nComo elegiste Contra entrega, **¡Tu pedido está confirmado y listo para despacho!** 🎉 Pagarás el total al recibir tu paquete.\n\n¡Gracias por preferir a Vekas! 👠`,
        buttons: ['Ver catálogo de nuevo', 'Hablar con asesor'],
        requiresHandoff: false
      };
    }

    // FSM LOGIC - Comprobante y Contacto (Para Pagos Digitales / Simulación)
    if (context.fsmState === 'AWAITING_RECEIPT_AND_CONTACT') {
      const rawText = context.history[0]?.rawText || intent;
      context.contactInfo = rawText;
      // La imagen es procesada y guardada en server.ts
      context.fsmState = 'IDLE'; // Cierra la orden
      return {
        text: `¡Tus datos y comprobante han sido recibidos!\n\nHemos registrado tu orden de ${context.selectedProduct} (Talla ${context.selectedSize}) para envío a ${context.selectedCity}.\n\n⚠️ **Tu pago y comprobante están en revisión.** Una vez validados por nuestro equipo, te confirmaremos y te enviaremos el número de guía de tu paquete.\n\n¡Gracias por preferir a Vekas! 👠`,
        buttons: ['Ver catálogo de nuevo', 'Hablar con asesor'],
        requiresHandoff: true // Requiere revisión humana del CRM
      };
    }

    // 3. NORMAL TEMPLATE FALLBACK (Si no está en el flujo de compras)
    const template = responseTemplates[knownIntent] ?? responseTemplates['otro'];

    // Variables adicionales extraídas del contexto
    const extraVars: Record<string, string> = {};
    if (context.sizeMentioned) extraVars['talla'] = context.sizeMentioned;
    if (context.productConsulted) extraVars['producto'] = context.productConsulted;

    const text = interpolate(template.base, extraVars);

    return {
      text,
      buttons: [...(template.buttons ?? [])],
      requiresHandoff: template.requiresHandoff ?? false,
    };
  }

  /**
   * Gestiona el ciclo de vida de una sesión conversacional.
   *
   * @param sessionId - Identificador de la sesión
   * @param action - Acción a ejecutar
   * @returns Resultado de la operación
   */
  async manageSession(
    sessionId: string,
    action: SessionAction
  ): Promise<SessionResult> {
    switch (action) {
      case 'create': {
        const context = this.contextService.createSession(sessionId);
        return { success: true, sessionId, context };
      }
      case 'get': {
        const context = this.contextService.getContext(sessionId);
        if (!context) {
          return { success: false, sessionId, message: 'Sesión no encontrada o expirada' };
        }
        return { success: true, sessionId, context };
      }
      case 'expire': {
        this.contextService.expireSession(sessionId);
        return { success: true, sessionId, message: 'Sesión expirada correctamente' };
      }
      case 'update': {
        // 'update' se gestiona externamente via updateContext; aquí es no-op
        const context = this.contextService.getContext(sessionId);
        return { success: !!context, sessionId, context: context ?? undefined };
      }
      default: {
        return { success: false, sessionId, message: `Acción desconocida: ${action}` };
      }
    }
  }

  // ─────────────────────────────────────────────
  // ACCESO AL CONTEXTO
  // ─────────────────────────────────────────────

  /**
   * Expone el servicio de contexto para uso externo (ej: desde la strategy).
   */
  public getContextService(): ConversationContextService {
    return this.contextService;
  }

  // ─────────────────────────────────────────────
  // MÉTODOS PRIVADOS
  // ─────────────────────────────────────────────

  /**
   * Calcula el score de confianza para una intención dada.
   *
   * Lógica de puntuación:
   * - Regex match completo   → weight del patrón
   * - Solo keyword match     → keywordWeight del patrón
   * - Sin match              → 0
   *
   * @param text - Texto normalizado del usuario
   * @param pattern - Patrón de la intención a evaluar
   * @returns Score de confianza entre 0 y 1
   */
  private scoreIntent(
    text: string,
    pattern: (typeof intentPatterns)[KnownIntent]
  ): number {
    // Evaluar regex principal (alta confianza)
    if (pattern.regex.test(text)) {
      return pattern.weight;
    }

    // Evaluar palabras clave (confianza media)
    const keywordMatches = pattern.keywords.filter((kw) =>
      text.toLowerCase().includes(kw.toLowerCase())
    ).length;

    if (keywordMatches > 0) {
      // Escalar según proporción de keywords encontradas
      const keywordRatio = Math.min(keywordMatches / 3, 1); // máx 3 keywords para score completo
      return pattern.keywordWeight * (0.5 + keywordRatio * 0.5);
    }

    return 0;
  }

  /**
   * Normaliza el texto para mejorar los matches de regex.
   * - Minúsculas
   * - Elimina tildes
   * - Colapsa múltiples espacios
   */
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // eliminar tildes
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Registra la clasificación en consola (desarrollo).
   * En producción, este log se persiste en PostgreSQL vía IALogger.
   */
  private logClassification(originalText: string, result: IntentResult): void {
    const below = result.confidence < this.confidenceThreshold ? ' ⚠️ BAJO UMBRAL' : '';
    console.log(
      `[RegexClassifier] "${originalText.substring(0, 60)}..." ` +
      `→ ${result.intent} (${(result.confidence * 100).toFixed(1)}%)${below}`
    );
  }
}
