import fs from 'fs';
import path from 'path';

// Definition of intents and their base variations
const INTENT_TEMPLATES: Record<string, string[]> = {
  consulta_talla: [
    "tienen talla {talla}",
    "busco talla {talla}",
    "hay en numero {talla}",
    "quiero {producto} en talla {talla}",
    "tienen {producto} {talla}",
    "busco {producto} numero {talla}",
    "me gustan l@s {producto}, ¿hay en {talla}?",
     "¿tienen {producto} disponibles en {talla}?",
    "necesito {producto} en talla {talla}",
    "{producto} {talla} por favor",
    "qué colores tienen de {producto} en talla {talla}"
  ],
  estado_pedido: [
    "dónde está mi pedido",
    "rastreo de mi compra",
    "cuando llega mi pedido",
    "como va mi envio",
    "estado de la orden",
    "quiero saber donde esta mi paquete",
    "info de mi pedido",
    "cuanto demora en llegar"
  ],
  faq_pago: [
    "como puedo pagar",
    "aceptan nequi",
    "se puede pagar con daviplata",
    "tienen pago contraentrega",
    "que metodos de pago manejan",
    "aceptan tarjeta",
    "puedo transferir",
    "como es el pago"
  ],
  faq_envio: [
    "cuanto vale el envio",
    "hacen envios a {ciudad}",
    "llegan a {ciudad}",
    "envian a {ciudad}",
    "cuanto demoran a {ciudad}",
    "el envio es gratis",
    "tienen domicilios en {ciudad}"
  ],
  quejar: [
    "mi pedido llego roto",
    "pesimo servicio",
    "es una estafa",
    "quiero la devolucion",
    "los zapatos me quedaron pequeños",
    "no me ha llegado nada y ya pague",
    "estoy enojado",
    "muy mala atencion"
  ],
  hablar_humano: [
    "quiero hablar con un humano",
    "pasame con un asesor",
    "necesito hablar con una persona",
    "quiero un agente real",
    "comunicarme con atencion al cliente",
    "no quiero hablar con el bot"
  ],
  saludo: [
    "hola",
    "buenas",
    "buenos dias",
    "buenas tardes",
    "que tal",
    "hola buenas",
    "saludos"
  ],
  despedida: [
    "gracias adios",
    "chao",
    "hasta luego",
    "nos vemos",
    "listo gracias",
    "eso es todo bye"
  ]
};

const ENTITIES = {
  talla: ["35", "36", "37", "38", "39", "40", "41", "42"],
  producto: ["botas", "tenis", "sandalias", "zapatos", "tacones", "mocasines", "botines"],
  ciudad: ["bogota", "medellin", "cali", "barranquilla", "bucaramanga", "cartagena", "pereira"]
};

interface DatasetEntry {
  text: string;
  intent: string;
  entities: Record<string, string>;
}

function generateVariations() {
  const dataset: DatasetEntry[] = [];

  for (const [intent, templates] of Object.entries(INTENT_TEMPLATES)) {
    for (const template of templates) {
      // If template relies on multiple entities
      if (template.includes("{producto}") && template.includes("{talla}")) {
        for (const prod of ENTITIES.producto) {
          for (const talla of ENTITIES.talla) {
            dataset.push({
              text: template.replace("{producto}", prod).replace("{talla}", talla),
              intent,
              entities: { producto: prod, talla }
            });
          }
        }
      } 
      else if (template.includes("{talla}")) {
        for (const talla of ENTITIES.talla) {
          dataset.push({
            text: template.replace("{talla}", talla),
            intent,
            entities: { talla }
          });
        }
      } 
      else if (template.includes("{ciudad}")) {
        for (const ciudad of ENTITIES.ciudad) {
          dataset.push({
            text: template.replace("{ciudad}", ciudad),
            intent,
            entities: { ciudad }
          });
        }
      }
      // No entities in template
      else {
        dataset.push({
          text: template,
          intent,
          entities: {}
        });
      }
    }
  }

  // Shuffle dataset and add some noise/variability (optional but good for training)
  dataset.sort(() => Math.random() - 0.5);

  return dataset;
}

const outputPath = path.join(__dirname, '../data/dataset.json');

// Ensure directory exists
const dir = path.dirname(outputPath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const data = generateVariations();

fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf-8');

console.log(`✅ Base de datos generada exitosamente!`);
console.log(`📁 Ruta: ${outputPath}`);
console.log(`📊 Total de registros generados: ${data.length}`);
