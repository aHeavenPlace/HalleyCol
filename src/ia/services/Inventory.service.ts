import { Pool } from 'pg';
import * as dotenv from 'dotenv';

// Local Product type to avoid import issues
export interface Product {
  id: string;
  name: string;
  brand: string;
  price: number;
  category: string;
  availableSizes: string[];
  stock: Record<string, number>;
}

dotenv.config();

const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: Number(process.env.PGPORT) || 5432,
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || '12345678',
  database: process.env.PGDATABASE || 'halleycol_db',
  ssl: true, // Render DB requiere SSL
});

// Productos mock de fallback por si la DB no está disponible
const FALLBACK_PRODUCTS: Product[] = [
  { id: '1', name: 'Nike Air Max', brand: 'Nike', price: 280000, category: 'tenis', availableSizes: ['36', '37', '38', '39', '40'], stock: {} },
  { id: '2', name: 'Adidas Ultraboost', brand: 'Adidas', price: 320000, category: 'tenis', availableSizes: ['35', '36', '37', '38', '39'], stock: {} },
  { id: '3', name: 'Crocs Classic', brand: 'Crocs', price: 150000, category: 'sandalias', availableSizes: ['34', '35', '36', '37', '38', '39', '40'], stock: {} },
  { id: '4', name: 'UGG Classic Ultra Mini', brand: 'UGG', price: 450000, category: 'botas', availableSizes: ['36', '37', '38', '39', '40'], stock: {} },
  { id: '5', name: 'Birkenstock Arizona', brand: 'Birkenstock', price: 280000, category: 'sandalias', availableSizes: ['35', '36', '37', '38', '39', '40'], stock: {} },
  { id: '6', name: 'Vans Old Skool', brand: 'Vans', price: 220000, category: 'tenis', availableSizes: ['35', '36', '37', '38', '39', '40'], stock: {} },
];

export class InventoryService {
  /**
   * Obtiene todos los productos con su stock.
   * Si la DB falla, retorna productos mock de fallback.
   */
  async getAllProducts(): Promise<Product[]> {
    const client = await pool.connect().catch(() => null);
    if (!client) {
      console.warn('[InventoryService] DB connection failed, using fallback products');
      return FALLBACK_PRODUCTS;
    }

    try {
      const res = await client.query('SELECT * FROM productos');
      const products = res.rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        brand: row.brand,
        price: row.price,
        category: row.category,
        availableSizes: row.available_sizes,
        stock: row.stock,
      } as Product));

      return products.length > 0 ? products : FALLBACK_PRODUCTS;
    } catch (error) {
      console.error('[InventoryService] Error fetching products, using fallback:', error);
      return FALLBACK_PRODUCTS;
    } finally {
      client.release();
    }
  }

  /**
   * Busca producto por id.
   */
  async getProductById(id: string): Promise<Product | undefined> {
    const client = await pool.connect();
    try {
      const res = await client.query('SELECT * FROM productos WHERE id = $1', [id]);
      if (res.rowCount === 0) return undefined;
      const row: any = res.rows[0];
      return {
        id: row.id,
        name: row.name,
        brand: row.brand,
        price: row.price,
        category: row.category,
        availableSizes: row.available_sizes,
        stock: row.stock,
      } as Product;
    } finally {
      client.release();
    }
  }

  /**
   * Obtiene la cantidad disponible de un modelo y talla.
   */
  async getStockByModelAndSize(modelId: string, size: string): Promise<number> {
    const product = await this.getProductById(modelId);
    if (!product) return 0;
    const qty = product.stock?.[size];
    return qty ?? 0;
  }

  /**
   * Total de pares disponibles de una categoría y talla.
   */
  async getTotalBySize(category: string, size: string): Promise<number> {
    const client = await pool.connect();
    try {
      const res = await client.query(
        `SELECT SUM((stock->>$2)::int) AS total FROM productos WHERE category = $1 AND stock ? $2`,
        [category, size]
      );
      const total = res.rows[0].total;
      return total ? Number(total) : 0;
    } finally {
      client.release();
    }
  }
}
