/**
 * @file real-catalog.ts
 * @description Catálogo de calzado real con marcas y modelos auténticos.
 *
 * Cada entrada sigue la misma interfaz `Product` usada en el resto del proyecto.
 * Este catálogo será insertado en PostgreSQL mediante `src/ia/scripts/setup-db.ts`.
 */

export interface Product {
  id: string;               // SKU o identificador único
  name: string;            // Nombre comercial
  brand: string;          // Marca (Nike, Adidas, Puma, etc.)
  price: number;           // Precio en COP
  category: string;        // categoría: tenis, botas, sandalias, tacones, mocasines
  availableSizes: string[]; // tallas disponibles
  stock: Record<string, number>; // stock por talla
}

export const realCatalog: Record<string, Product> = {
  // Nike Air Max 90 – clásico deportivo
  'nike_airmax90': {
    id: 'nike_airmax90',
    name: 'Air Max 90',
    brand: 'Nike',
    price: 275000,
    category: 'tenis',
    availableSizes: ['35', '36', '37', '38', '39', '40', '41'],
    stock: { '35': 5, '36': 8, '37': 12, '38': 15, '39': 10, '40': 7, '41': 3 },
  },
  // Adidas Ultraboost 22 – running premium
  'adidas_ultraboost22': {
    id: 'adidas_ultraboost22',
    name: 'Ultraboost 22',
    brand: 'Adidas',
    price: 340000,
    category: 'tenis',
    availableSizes: ['36', '37', '38', '39', '40', '41', '42'],
    stock: { '36': 4, '37': 6, '38': 9, '39': 11, '40': 8, '41': 5, '42': 2 },
  },
  // Puma Suede Classic – estilo casual
  'puma_suede': {
    id: 'puma_suede',
    name: 'Suede Classic',
    brand: 'Puma',
    price: 190000,
    category: 'tenis',
    availableSizes: ['35', '36', '37', '38', '39', '40'],
    stock: { '35': 7, '36': 10, '37': 13, '38': 9, '39': 5, '40': 3 },
  },
  // Timberland Classic 6" Boots – botas resistentes
  'timberland_boots': {
    id: 'timberland_boots',
    name: 'Classic 6" Boots',
    brand: 'Timberland',
    price: 420000,
    category: 'botas',
    availableSizes: ['38', '39', '40', '41', '42'],
    stock: { '38': 6, '39': 9, '40': 7, '41': 4, '42': 2 },
  },
  // Dr. Martens 1460 – botas icónicas
  'drmartens_1460': {
    id: 'drmartens_1460',
    name: '1460 Smooth Leather',
    brand: 'Dr. Martens',
    price: 380000,
    category: 'botas',
    availableSizes: ['36', '37', '38', '39', '40', '41'],
    stock: { '36': 3, '37': 5, '38': 8, '39': 6, '40': 4, '41': 2 },
  },
  // Birkenstock Arizona – sandalias cómodas
  'birkenstock_arizona': {
    id: 'birkenstock_arizona',
    name: 'Arizona',
    brand: 'Birkenstock',
    price: 210000,
    category: 'sandalias',
    availableSizes: ['35', '36', '37', '38', '39', '40'],
    stock: { '35': 9, '36': 12, '37': 15, '38': 13, '39': 10, '40': 7 },
  },
  // Steve Madden Ankle Strap – tacones elegantes
  'stevemadden_ankle': {
    id: 'stevemadden_ankle',
    name: 'Ankle Strap',
    brand: 'Steve Madden',
    price: 250000,
    category: 'tacones',
    availableSizes: ['36', '37', '38', '39', '40'],
    stock: { '36': 4, '37': 6, '38': 8, '39': 5, '40': 3 },
  },
  // Gola Classics – mocasines casuales
  'gola_classics': {
    id: 'gola_classics',
    name: 'Classics',
    brand: 'Gola',
    price: 165000,
    category: 'mocasines',
    availableSizes: ['36', '37', '38', '39', '40'],
    stock: { '36': 7, '37': 9, '38': 12, '39': 8, '40': 5 },
  },
  // Nike Air Force 1 – clásico urbano
  'nike_airforce1': {
    id: 'nike_airforce1',
    name: 'Air Force 1',
    brand: 'Nike',
    price: 320000,
    category: 'tenis',
    availableSizes: ['35', '36', '37', '38', '39', '40', '41'],
    stock: { '35': 10, '36': 15, '37': 20, '38': 25, '39': 18, '40': 12, '41': 8 },
  },
  // Vans Old Skool – skate y casual
  'vans_oldskool': {
    id: 'vans_oldskool',
    name: 'Old Skool',
    brand: 'Vans',
    price: 210000,
    category: 'tenis',
    availableSizes: ['36', '37', '38', '39', '40'],
    stock: { '36': 8, '37': 14, '38': 16, '39': 10, '40': 6 },
  },
  // Converse Chuck Taylor All Star – clásico de lona
  'converse_chucktaylor': {
    id: 'converse_chucktaylor',
    name: 'Chuck Taylor All Star',
    brand: 'Converse',
    price: 185000,
    category: 'tenis',
    availableSizes: ['35', '36', '37', '38', '39', '40', '41'],
    stock: { '35': 12, '36': 18, '37': 22, '38': 24, '39': 15, '40': 9, '41': 4 },
  },
  // Crocs Classic Clog – sandalias cómodas
  'crocs_classic': {
    id: 'crocs_classic',
    name: 'Classic Clog',
    brand: 'Crocs',
    price: 140000,
    category: 'sandalias',
    availableSizes: ['35', '36', '37', '38', '39', '40'],
    stock: { '35': 20, '36': 25, '37': 30, '38': 28, '39': 15, '40': 10 },
  },
  // Aldo Stessy – tacones clásicos
  'aldo_stessy': {
    id: 'aldo_stessy',
    name: 'Stessy',
    brand: 'Aldo',
    price: 290000,
    category: 'tacones',
    availableSizes: ['36', '37', '38', '39'],
    stock: { '36': 5, '37': 8, '38': 6, '39': 3 },
  },
  // Bosi Botines Cuero – botines de invierno
  'bosi_botines': {
    id: 'bosi_botines',
    name: 'Botines de Cuero',
    brand: 'Bosi',
    price: 360000,
    category: 'botines',
    availableSizes: ['36', '37', '38', '39', '40'],
    stock: { '36': 4, '37': 7, '38': 10, '39': 5, '40': 2 },
  },
};
