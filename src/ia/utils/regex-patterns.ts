/**
 * @file regex-patterns.ts
 * @description Patrones regex de extracción de entidades del dominio HalleyCol.
 * Usados por el RegexClassifier para identificar tallas, colores, ciudades
 * y números de pedido en el texto del cliente.
 *
 * IMPORTANTE: Cada llamada a extractEntities o extractAllMatches crea un
 * RegExp fresco para evitar el bug de `lastIndex` en patrones con flag /g.
 * @module ia/utils
 * @version 1.0.1
 */

// ─────────────────────────────────────────────
// FÁBRICA DE PATRONES
// ─────────────────────────────────────────────

/**
 * Devuelve un nuevo conjunto de instancias RegExp en cada llamada.
 * Los patrones soportan:
 * - Singular y plural (rosada/rosadas, bota/botas)
 * - Variantes con y sin tilde (Bogotá/Bogota, café/cafe)
 */
function buildPatterns() {
  return {
    /** Tallas numéricas de calzado: 34–42 */
    talla: /\b(3[4-9]|4[0-2])\b/g,

    /**
     * Colores en singular y plural.
     * @example "sandalias rosadas" → "rosadas"
     */
    color: /\b(negr[oa]s?|blanc[oa]s?|rosad[oa]s?|roj[oa]s?|azules?|caf[eé]s?|beige|nude|dorad[oa]s?|plateados?|plateadas?|verdes?|morad[oa]s?|naranjas?|vinotinto)\b/gi,

    /**
     * Regex abarcador de municipios top, TODOS los departamentos de Colombia y Área Metropolitana.
     * Soporta las preposiciones "estoy en", "vivo", "para", "a".
     */
    ciudad: /(?:estoy en|vivo en|para|a)?\s*(amazonas|antioquia|arauca|atl[aá]ntico|bol[ií]var|boyac[aá]|caldas|caquet[aá]|casanare|cauca|cesar|choc[oó]|c[oó]rdoba|cundinamarca|guain[ií]a|guaviare|huila|la guajira|magdalena|meta|nari[nñ]o|norte de santander|putumayo|quind[ií]o|risaralda|san andr[eé]s|providencia|santander|sucre|tolima|valle del cauca|vaup[eé]s|vichada|bogot[aá]|bgta|medell[ií]n|medallo|mediin|cali|bucaramanga|bucara|bga|barranquilla|killa|cartagena|c[uú]cuta|santa marta|ibagu[eé]|bello|villavicencio|villavo|soledad|pereira|manizales|valledupar|neiva|monter[ií]a|pasto|armenia|soacha|popay[aá]n|floridablanca|florida|gir[oó]n|piedecuesta|lebrija|palmira|buenaventura|sincelejo|barrancabermeja|barranca|tunja|riohacha|florencia|cartago|quibd[oó]|turbaco|zipaquir[aá]|girardot|fusagasug[aá]|fusa|chia|ch[ií]a|facatativ[aá]|faca|p[aá]mplo[nñ]a)/i,

    /**
     * Número de pedido en formato HalleyCol: HC-XXXX o #XXXX.
     * @example "mi pedido HC-5678" → "HC-5678"
     */
    numeroPedido: /\b(HC-\d{4,6}|#\d{4,6})\b/gi,

    /**
     * Teléfonos colombianos de 10 dígitos iniciando con 3.
     * @example "3001234567"
     */
    telefono: /\b3\d{9}\b/g,

    /**
     * Tipos de calzado en singular y plural.
     * @example "las botas cafés" → "botas"
     */
    tipoCalzado: /\b(sandalias?|tac[oó]n|tacones|botas?|zapatos?|mules?|baletas?|plataformas?|cu[nñ]as?|sneakers?)\b/gi,

    /**
     * Modelos específicos del catálogo real
     */
    productoEspecifico: /\b(air max|ultraboost|suede|classic|1460|arizona|ankle|classics|air force|old skool|chuck taylor|clog|stessy|botines)\b/gi,

    /**
     * Métodos de pago
     */
    metodoPago: /\b(nequi|daviplata|efectivo|contra\s*entrega|tarjeta)\b/gi,
  };
}

// ─────────────────────────────────────────────
// TIPOS EXPORTADOS
// ─────────────────────────────────────────────

/** Tipo de los patrones disponibles (inferido de la fábrica) */
type PatternMap = ReturnType<typeof buildPatterns>;

/** Claves de entidad disponibles */
export type EntityKey = keyof PatternMap;

/**
 * Referencia de patrones exportada para compatibilidad.
 * ⚠️  No usar directamente en loops — usar extractEntities() que crea instancias frescas.
 */
export const entityPatterns: PatternMap = buildPatterns();

// ─────────────────────────────────────────────
// FUNCIONES DE EXTRACCIÓN
// ─────────────────────────────────────────────

/**
 * Extrae todas las entidades presentes en un texto.
 * Crea RegExp frescos en cada llamada para evitar bugs de `lastIndex`.
 *
 * @param text - Texto del mensaje del usuario
 * @returns Objeto con entidades encontradas (null si no hay match)
 *
 * @example
 * extractEntities('quiero las sandalias rosadas en talla 38 para Bucaramanga')
 * // → { talla: '38', color: 'rosadas', ciudad: 'Bucaramanga', tipoCalzado: 'sandalias', ... }
 */
export function extractEntities(text: string): Record<string, string | null> {
  // buildPatterns() crea instancias frescas → ningún lastIndex compartido
  const patterns = buildPatterns();
  const entities: Record<string, string | null> = {};

  for (const key of Object.keys(patterns) as EntityKey[]) {
    const match = patterns[key].exec(text);
    entities[key] = match ? match[0] : null;
  }

  return entities;
}

/**
 * Extrae TODAS las coincidencias de una entidad (listas de tallas, colores, etc.).
 *
 * @param text - Texto a analizar
 * @param entityKey - Entidad a extraer
 * @returns Array con todas las coincidencias encontradas
 *
 * @example
 * extractAllMatches('tienen 37, 38 o 39?', 'talla')
 * // → ['37', '38', '39']
 */
export function extractAllMatches(text: string, entityKey: EntityKey): string[] {
  const patterns = buildPatterns();
  const pattern = patterns[entityKey];
  const matches: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    matches.push(match[0]);
  }

  return matches;
}
