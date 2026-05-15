import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { requireAuth, requireRole } from './auth';

const router = Router();

// Todos los endpoints de CRM requieren autenticación
router.use(requireAuth);

// ─────────────────────────────────────────────
// PRODUCTOS
// ─────────────────────────────────────────────
// Roles: admin (total), ventas (lectura/escritura)
router.get('/products', requireRole('admin', 'ventas', 'logistica', 'asesor'), async (req: Request, res: Response) => {
  try {
    const pool: Pool = req.app.locals.pool;
    const result = await pool.query('SELECT * FROM productos ORDER BY name ASC');
    res.json({ success: true, products: result.rows });
  } catch (error) {
    console.error('[CRM] Error fetching products:', error);
    res.status(500).json({ error: 'Error fetching products' });
  }
});

router.post('/products', requireRole('admin', 'ventas'), async (req: Request, res: Response) => {
  try {
    const { id, name, brand, price, category, available_sizes, stock } = req.body;
    const pool: Pool = req.app.locals.pool;

    await pool.query(
      `INSERT INTO productos (id, name, brand, price, category, available_sizes, stock)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         brand = EXCLUDED.brand,
         price = EXCLUDED.price,
         category = EXCLUDED.category,
         available_sizes = EXCLUDED.available_sizes,
         stock = EXCLUDED.stock;`,
      [id, name, brand, price, category, available_sizes, stock]
    );

    res.json({ success: true, message: 'Producto guardado exitosamente' });
  } catch (error) {
    console.error('[CRM] Error saving product:', error);
    res.status(500).json({ error: 'Error saving product' });
  }
});

// ─────────────────────────────────────────────
// PEDIDOS
// ─────────────────────────────────────────────
// Roles: admin (total), ventas/logistica (lectura), logistica/admin (actualizar)
router.get('/orders', requireRole('admin', 'ventas', 'logistica', 'asesor'), async (req: Request, res: Response) => {
  try {
    const pool: Pool = req.app.locals.pool;
    const result = await pool.query('SELECT * FROM pedidos ORDER BY created_at DESC');
    res.json({ success: true, orders: result.rows });
  } catch (error) {
    console.error('[CRM] Error fetching orders:', error);
    res.status(500).json({ error: 'Error fetching orders' });
  }
});

router.patch('/orders/:id', requireRole('admin', 'logistica'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { guia_tracker, estado, logistica } = req.body;
    const pool: Pool = req.app.locals.pool;

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (guia_tracker !== undefined) {
      const finalGuia = logistica ? `${logistica}: ${guia_tracker}` : guia_tracker;
      updates.push(`guia_tracker = $${paramIndex++}`);
      values.push(finalGuia);
    }
    if (estado !== undefined) {
      updates.push(`estado = $${paramIndex++}`);
      values.push(estado);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);
    const query = `UPDATE pedidos SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;

    const result = await pool.query(query, values);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    const order = result.rows[0];
    const sessionId = order.cliente_whatsapp;

    // Notificaciones Push Simuladas (insertar en la tabla de mensajes)
    if (estado !== undefined && sessionId) {
      let mensajePush = '';
      if (estado === 'Pagado') {
        mensajePush = '✅ ¡Tu pago ha sido validado exitosamente! Tu pedido pasará a la fase de preparación y despacho.';
      } else if (estado === 'Rechazado') {
        mensajePush = '🚫 Lo sentimos, no pudimos validar tu comprobante de pago. Por favor comunícate con un asesor.';
      } else if (estado === 'Enviado' && guia_tracker) {
        mensajePush = `🚚 ¡Tu pedido está en camino!\n\nHemos despachado tu paquete con **${logistica || 'nuestra logística'}**.\nTu número de guía de rastreo es: **${guia_tracker}**.\n\n¡Gracias por tu compra!`;
      }

      if (mensajePush) {
        await pool.query(
          `INSERT INTO mensajes (session_id, emisor, contenido) VALUES ($1, $2, $3)`,
          [sessionId, 'bot', mensajePush]
        );
      }
    }

    res.json({ success: true, order });
  } catch (error) {
    console.error('[CRM] Error updating order:', error);
    res.status(500).json({ error: 'Error updating order' });
  }
});

// ─────────────────────────────────────────────
// CHATS Y CONVERSACIONES
// ─────────────────────────────────────────────
// Roles: admin (total), asesor (lectura/escritura), ventas (lectura)
router.get('/conversations', requireRole('admin', 'asesor', 'ventas'), async (req: Request, res: Response) => {
  try {
    const pool: Pool = req.app.locals.pool;
    const result = await pool.query('SELECT * FROM conversaciones ORDER BY updated_at DESC');
    res.json({ success: true, conversations: result.rows });
  } catch (error) {
    console.error('[CRM] Error fetching conversations:', error);
    res.status(500).json({ error: 'Error fetching conversations' });
  }
});

router.get('/conversations/:sessionId/messages', requireRole('admin', 'asesor', 'ventas'), async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const pool: Pool = req.app.locals.pool;
    const result = await pool.query('SELECT * FROM mensajes WHERE session_id = $1 ORDER BY created_at ASC', [sessionId]);
    res.json({ success: true, messages: result.rows });
  } catch (error) {
    console.error('[CRM] Error fetching messages:', error);
    res.status(500).json({ error: 'Error fetching messages' });
  }
});

// ─────────────────────────────────────────────
// AGREGACIONES DE REPORTES Y DASHBOARD
// ─────────────────────────────────────────────
// Roles: admin (total), ventas (lectura)
router.get('/dashboard', requireRole('admin', 'ventas'), async (req: Request, res: Response) => {
  try {
    const pool: Pool = req.app.locals.pool;

    // Total pedidos por estado
    const statesResult = await pool.query(`
      SELECT estado, COUNT(*) as count 
      FROM pedidos 
      GROUP BY estado
    `);

    // Ventas de hoy
    const todaySales = await pool.query(`
      SELECT SUM(total) as total 
      FROM pedidos 
      WHERE DATE(created_at) = CURRENT_DATE
    `);

    // Pedidos recientes
    const recentOrders = await pool.query(`
      SELECT * FROM pedidos 
      ORDER BY created_at DESC 
      LIMIT 5
    `);

    // Ventas últimos 7 días
    const last7DaysSales = await pool.query(`
      SELECT 
        DATE(created_at) as date,
        SUM(total) as total
      FROM pedidos
      WHERE created_at >= CURRENT_DATE - INTERVAL '6 days'
      GROUP BY DATE(created_at)
      ORDER BY DATE(created_at) ASC
    `);

    res.json({
      success: true,
      data: {
        estados: statesResult.rows,
        ventas_hoy: todaySales.rows[0]?.total || 0,
        pedidos_recientes: recentOrders.rows,
        ventas_7_dias: last7DaysSales.rows
      }
    });
  } catch (error) {
    console.error('[CRM] Error fetching dashboard data:', error);
    res.status(500).json({ error: 'Error fetching dashboard data' });
  }
});

router.get('/clients', requireRole('admin', 'ventas'), async (req: Request, res: Response) => {
  try {
    const pool: Pool = req.app.locals.pool;

    // Agrupar pedidos por cliente (basado en whatsapp)
    const result = await pool.query(`
      SELECT 
        cliente_whatsapp as id,
        MAX(cliente_nombre) as nombre,
        COUNT(*) as compras,
        SUM(total) as total_gastado,
        MAX(created_at) as ultima_compra
      FROM pedidos
      GROUP BY cliente_whatsapp
      ORDER BY total_gastado DESC
    `);

    res.json({ success: true, clients: result.rows });
  } catch (error) {
    console.error('[CRM] Error fetching clients:', error);
    res.status(500).json({ error: 'Error fetching clients' });
  }
});

router.get('/reports', requireRole('admin', 'ventas'), async (req: Request, res: Response) => {
  try {
    const pool: Pool = req.app.locals.pool;

    const totals = await pool.query(`
      SELECT 
        COUNT(*) as total_pedidos,
        SUM(total) as ventas_totales,
        COUNT(DISTINCT cliente_whatsapp) as clientes_unicos,
        AVG(total) as ticket_promedio
      FROM pedidos
    `);

    // Métodos de pago
    const paymentMethods = await pool.query(`
      SELECT metodo_pago, COUNT(*) as count 
      FROM pedidos 
      GROUP BY metodo_pago
      ORDER BY count DESC
    `);

    // Productos más vendidos
    const topProducts = await pool.query(`
      SELECT productos as nombre, COUNT(*) as unidades, SUM(total) as ingresos 
      FROM pedidos 
      GROUP BY productos 
      ORDER BY unidades DESC 
      LIMIT 6
    `);

    res.json({
      success: true,
      data: {
        ...totals.rows[0],
        metodos_pago: paymentMethods.rows,
        productos_vendidos: topProducts.rows
      }
    });
  } catch (error) {
    console.error('[CRM] Error fetching reports:', error);
    res.status(500).json({ error: 'Error fetching reports' });
  }
});

export default router;
