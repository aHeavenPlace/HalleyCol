import { ConversationContext } from '../types/ia.types';
import { businessConfig } from './response-templates';
import { Product } from '../services/Inventory.service';

/**
 * Builds the text prompt for Gemini including business context, product catalog, and conversation history.
 */
export function buildGeminiPrompt(
  userMessage: string,
  context: ConversationContext,
  catalog: Product[]
): string {
  // Build a readable conversation history showing both user and bot turns
  const historyText = context.history
    .slice()
    .reverse() // oldest first
    .map((h, i) => {
      const userLine = `[${i + 1}] Usuario: "${h.rawText || h.intent}"`;
      const botLine = h.fallbackResponse
        ? `    Bot: "${h.fallbackResponse.substring(0, 120)}..."`
        : `    (intent detectado: ${h.intent}, confianza: ${(h.confidence * 100).toFixed(0)}%)`;
      return `${userLine}\n${botLine}`;
    })
    .join('\n');

  const catalogText = catalog
    .map(
      (p) =>
        `* ${p.name} (Marca: ${p.brand}, Categoría: ${p.category}, Precio: $${p.price.toLocaleString('es-CO')})\n  Tallas: ${p.availableSizes.join(', ')} | Stock: ${JSON.stringify(p.stock)}`
    )
    .join('\n');

  const fsmInfo = context.fsmState !== 'IDLE'
    ? `\nESTADO ACTUAL DEL FLUJO: ${context.fsmState}${context.selectedProduct ? ` | Producto: ${context.selectedProduct}` : ''}${context.selectedSize ? ` | Talla: ${context.selectedSize}` : ''}${context.selectedCity ? ` | Ciudad: ${context.selectedCity}` : ''}`
    : '';

  return `Eres el asistente virtual de ventas de Vekas, una tienda de calzado femenino en Bucaramanga, Colombia.
Se te derivó esta consulta porque el usuario hizo una pregunta compleja, quiere comprar al por mayor, o preguntó por stock específico que no pudo ser resuelto por plantillas.

--- DATOS DEL NEGOCIO ---
${JSON.stringify(businessConfig, null, 2)}
${fsmInfo}

--- INVENTARIO ACTUAL ---
${catalogText}

--- HISTORIAL DE CONVERSACIÓN (más antiguo arriba) ---
${historyText || 'Sin historial reciente.'}

--- INSTRUCCIONES ---
1. Responde de forma amable, concisa y en español colombiano informal (tuteo).
2. Analiza el INVENTARIO ACTUAL para responder consultas de stock o tallas.
3. Si el usuario quiere comprar algo y hay stock, confírmalo e invítalo a continuar el proceso.
4. Si pide una talla que no hay en un modelo, ofrécele otros modelos disponibles en esa talla.
5. NO uses markdown pesado. Puedes usar **negrita** para resaltar nombres de productos o precios.
6. Máximo 3 botones de acción rápida, relacionados con la respuesta. Si no aplica, deja buttons vacío.
7. Devuelve la respuesta EXACTAMENTE en el siguiente formato JSON (sin bloques de código markdown):
{"text": "Tu respuesta al usuario aquí", "buttons": ["Botón 1", "Botón 2"]}

--- NUEVO MENSAJE DEL USUARIO ---
${userMessage}
`;
}
