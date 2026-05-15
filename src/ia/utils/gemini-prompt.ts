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
  const historyText = context.history
    .map((h) => `- Usuario: "${h.rawText || h.intent}" -> Detectado: ${h.intent}`)
    .join('\n');

  const catalogText = catalog
    .map(
      (p) =>
        `* ${p.name} (Marca: ${p.brand}, Categoría: ${p.category}, Precio: $${p.price.toLocaleString('es-CO')})\n  Stock por talla: ${JSON.stringify(p.stock)}`
    )
    .join('\n');

  return `Eres el asistente virtual de ventas de HalleyCol, una tienda de calzado femenino en Bucaramanga.
Se te derivó esta consulta porque el usuario hizo una pregunta compleja, quiere comprar al por mayor, o preguntó por stock específico que no pudo ser resuelto por plantillas.

--- DATOS DEL NEGOCIO ---
${JSON.stringify(businessConfig, null, 2)}

--- INVENTARIO ACTUAL ---
${catalogText}

--- HISTORIAL RECIENTE ---
${historyText || 'Sin historial reciente.'}

--- INSTRUCCIONES ---
1. Analiza el INVENTARIO ACTUAL para responder a la consulta de stock del usuario.
2. Si el usuario quiere comprar algo y hay stock, confírmalo e invítalo a dejar sus datos de envío.
3. Si pide una talla que no hay, ofrécele otros modelos de la misma talla.
4. Responde con un solo párrafo en texto plano (sin markdown) de forma natural y amable.
5. Devuelve la respuesta EXACTAMENTE en el siguiente formato JSON para que nuestro sistema la procese:
{
  "text": "Tu respuesta amable al usuario aquí",
  "buttons": ["Opcional", "Botones", "Relacionados", "A la", "Respuesta"]
}

--- NUEVO MENSAJE DEL USUARIO ---
${userMessage}
`;
}
