import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
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

router.patch('/orders/:id', requireRole('admin', 'logistica', 'ventas'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { guia_tracker, estado, logistica } = req.body;
    const pool: Pool = req.app.locals.pool;
    const currentUser = (req as any).user;

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // Solo admin y logistica pueden poner guía de envío
    if (guia_tracker !== undefined && (currentUser.role === 'admin' || currentUser.role === 'logistica')) {
      const finalGuia = logistica ? `${logistica}: ${guia_tracker}` : guia_tracker;
      updates.push(`guia_tracker = $${paramIndex++}`);
      values.push(finalGuia);
    }

    // Ventas solo puede cambiar estado a Pagado o Rechazado
    if (estado !== undefined) {
      if (currentUser.role === 'ventas' && !['Pagado', 'Rechazado'].includes(estado)) {
        return res.status(403).json({ error: 'Ventas solo puede aprobar o rechazar pedidos' });
      }
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

    // Notificaciones Push Simuladas
    if (sessionId) {
      let mensajePush = '';
      if (estado === 'Pagado') {
        mensajePush = '✅ ¡Tu pago ha sido validado exitosamente! Por favor espera tu número de guía (máximo 2 días hábiles).';
      } else if (estado === 'Rechazado') {
        mensajePush = '🚫 Lo sentimos, no pudimos validar tu comprobante de pago. Por favor comunícate con un asesor.';
      }

      if (guia_tracker !== undefined && guia_tracker.trim() !== '') {
        const empresa = logistica || 'nuestra logística';
        mensajePush += (mensajePush ? '\n\n' : '') + `🚚 ¡Tu pedido está en camino!\n\nHemos despachado tu paquete con **${empresa}**.\nTu número de guía de rastreo es: **${guia_tracker}**.\n\n¡Gracias por tu compra!`;
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

router.post('/conversations/:sessionId/messages', requireRole('admin', 'asesor'), async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { message } = req.body;
    const pool: Pool = req.app.locals.pool;

    if (!message) {
      return res.status(400).json({ error: 'El contenido del mensaje es requerido' });
    }

    // Insertar el mensaje del asesor
    const msgResult = await pool.query(
      `INSERT INTO mensajes (session_id, emisor, contenido) VALUES ($1, $2, $3) RETURNING *`,
      [sessionId, 'asesor', message]
    );

    // Actualizar la fecha de actualización de la conversación
    await pool.query(
      `UPDATE conversaciones SET updated_at = CURRENT_TIMESTAMP WHERE session_id = $1`,
      [sessionId]
    );

    res.json({ success: true, message: msgResult.rows[0] });
  } catch (error) {
    console.error('[CRM] Error sending advisor message:', error);
    res.status(500).json({ error: 'Error sending advisor message' });
  }
});

router.patch('/conversations/:sessionId', requireRole('admin', 'asesor'), async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { necesita_asesor, estado_fsm } = req.body;
    const pool: Pool = req.app.locals.pool;

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (necesita_asesor !== undefined) {
      updates.push(`necesita_asesor = $${paramIndex++}`);
      values.push(necesita_asesor);
    }
    if (estado_fsm !== undefined) {
      updates.push(`estado_fsm = $${paramIndex++}`);
      values.push(estado_fsm);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(sessionId);
    const query = `UPDATE conversaciones SET ${updates.join(', ')} WHERE session_id = $${paramIndex} RETURNING *`;

    const result = await pool.query(query, values);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Conversación no encontrada' });
    }

    res.json({ success: true, conversation: result.rows[0] });
  } catch (error) {
    console.error('[CRM] Error updating conversation:', error);
    res.status(500).json({ error: 'Error updating conversation' });
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

// ─────────────────────────────────────────────
// GESTIÓN DE USUARIOS (Solo Admin)
// ─────────────────────────────────────────────
router.get('/users', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const pool: Pool = req.app.locals.pool;
    const result = await pool.query('SELECT id, username, role FROM usuarios ORDER BY username ASC');
    res.json({ success: true, users: result.rows });
  } catch (error) {
    console.error('[CRM] Error fetching users:', error);
    res.status(500).json({ error: 'Error fetching users' });
  }
});

router.post('/users', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { username, password, role } = req.body;
    const pool: Pool = req.app.locals.pool;

    if (!username || !password || !role) {
      return res.status(400).json({ error: 'Todos los campos (usuario, clave, rol) son obligatorios' });
    }

    // Verificar si el usuario ya existe
    const existsResult = await pool.query('SELECT id FROM usuarios WHERE username = $1', [username]);
    if (existsResult.rowCount && existsResult.rowCount > 0) {
      return res.status(400).json({ error: 'El nombre de usuario ya existe' });
    }

    // Encriptar contraseña
    const passwordHash = await bcrypt.hash(password, 10);

    // Insertar usuario
    const result = await pool.query(
      `INSERT INTO usuarios (username, password_hash, role) VALUES ($1, $2, $3) RETURNING id, username, role`,
      [username, passwordHash, role]
    );

    res.json({ success: true, user: result.rows[0], message: 'Usuario creado exitosamente' });
  } catch (error) {
    console.error('[CRM] Error creating user:', error);
    res.status(500).json({ error: 'Error al crear usuario' });
  }
});

router.patch('/users/:id', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { username, password, role } = req.body;
    const pool: Pool = req.app.locals.pool;

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (username !== undefined) {
      // Verificar si el nuevo username está tomado por otro usuario
      const existsResult = await pool.query('SELECT id FROM usuarios WHERE username = $1 AND id <> $2', [username, Number(id)]);
      if (existsResult.rowCount && existsResult.rowCount > 0) {
        return res.status(400).json({ error: 'El nombre de usuario ya está tomado' });
      }
      updates.push(`username = $${paramIndex++}`);
      values.push(username);
    }

    if (password !== undefined && password.trim() !== '') {
      const passwordHash = await bcrypt.hash(password, 10);
      updates.push(`password_hash = $${paramIndex++}`);
      values.push(passwordHash);
    }

    if (role !== undefined) {
      updates.push(`role = $${paramIndex++}`);
      values.push(role);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No hay campos para actualizar' });
    }

    values.push(Number(id));
    const query = `UPDATE usuarios SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING id, username, role`;

    const result = await pool.query(query, values);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({ success: true, user: result.rows[0], message: 'Usuario actualizado exitosamente' });
  } catch (error) {
    console.error('[CRM] Error updating user:', error);
    res.status(500).json({ error: 'Error al actualizar usuario' });
  }
});

router.delete('/users/:id', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const pool: Pool = req.app.locals.pool;
    const currentUser = (req as any).user;

    if (currentUser && currentUser.id === Number(id)) {
      return res.status(400).json({ error: 'No puedes eliminarte a ti mismo' });
    }

    const result = await pool.query('DELETE FROM usuarios WHERE id = $1 RETURNING id, username', [Number(id)]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({ success: true, message: 'Usuario eliminado exitosamente', user: result.rows[0] });
  } catch (error) {
    console.error('[CRM] Error deleting user:', error);
    res.status(500).json({ error: 'Error al eliminar usuario' });
  }
});

export default router;
