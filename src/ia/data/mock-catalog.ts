export interface Product {
  id: string;
  name: string;
  price: number;
  availableSizes: string[];
  category: string;
  stock: Record<string, number>; // key = talla, value = cantidad disponible
}

export const catalog: Record<string, Product> = {
  'diana': {
    id: 'diana',
    name: 'Botas Diana',
    price: 145000,
    availableSizes: ['36', '37', '38'],
    category: 'botas',
    stock: { '36': 12, '37': 8, '38': 5 }
  },
  'urban': {
    id: 'urban',
    name: 'Tenis Urban',
    price: 120000,
    availableSizes: ['35', '36', '37', '38', '39', '40'],
    category: 'tenis',
    stock: { '35': 10, '36': 15, '37': 9, '38': 12, '39': 7, '40': 4 }
  },
  'verano': {
    id: 'verano',
    name: 'Sandalias Verano',
    price: 85000,
    availableSizes: ['37', '38', '39'],
    category: 'sandalias',
    stock: { '37': 20, '38': 18, '39': 14 }
  },
  'elegance': {
    id: 'elegance',
    name: 'Tacones Elegance',
    price: 160000,
    availableSizes: ['36', '38'],
    category: 'tacones',
    stock: { '36': 6, '38': 3 }
  }
};

export function findProductByName(name: string): Product | undefined {
  const normalized = name.toLowerCase();
  for (const product of Object.values(catalog)) {
    if (normalized.includes(product.id) || product.name.toLowerCase().includes(normalized)) {
      return product;
    }
  }
  return undefined;
}

export function findProductsByCategory(categoryName: string): Product[] {
  const normalized = categoryName.toLowerCase();
  // Map common synonyms to our categories
  let categoryKey = normalized;
  if (normalized.includes('tennis') || normalized.includes('tenis') || normalized.includes('zapatos')) categoryKey = 'tenis';
  else if (normalized.includes('bota') || normalized.includes('botine')) categoryKey = 'botas';
  else if (normalized.includes('sandalia')) categoryKey = 'sandalias';
  else if (normalized.includes('tacon') || normalized.includes('tacón')) categoryKey = 'tacones';
  else if (normalized.includes('mocasin')) categoryKey = 'mocasines';
  
  return Object.values(catalog).filter(p => p.category === categoryKey);
}
