import express from 'express';
import path from 'path';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { Pool } from 'pg';
import dotenv from 'dotenv';

import { createIAService } from '../ia';
import { ConversationContext } from '../ia/types/ia.types';
import authRoutes from './routes/auth';
import crmRoutes from './routes/crm';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Debug: Log database config (sin exponer password)
console.log('[DB Config] Host:', process.env.PGHOST || 'localhost');
console.log('[DB Config] Database:', process.env.PGDATABASE);
console.log('[DB Config] User:', process.env.PGUSER);
console.log('[DB Config] Port:', process.env.PGPORT || 5432);

// Configuración de la base de datos compartida
const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: Number(process.env.PGPORT) || 5432,
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || '12345678',
  database: process.env.PGDATABASE || 'halleycol_db',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});
app.locals.pool = pool;

app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Mount routers
app.use('/api/auth', authRoutes);
app.use('/api/crm', crmRoutes);

// Rutas de páginas estáticas
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../../src/test-ui/public/login.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../../src/test-ui/public/login.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '../../src/test-ui/public/dashboard.html'));
});

app.get('/dashboard-logistica', (req, res) => {
  res.sendFile(path.join(__dirname, '../../src/test-ui/public/dashboard-logistica.html'));
});

app.get('/dashboard-asesor', (req, res) => {
  res.sendFile(path.join(__dirname, '../../src/test-ui/public/dashboard-asesor.html'));
});

app.get('/productos', (req, res) => {
  res.sendFile(path.join(__dirname, '../../src/test-ui/public/productos.html'));
});

app.get('/pedidos', (req, res) => {
  res.sendFile(path.join(__dirname, '../../src/test-ui/public/pedidos.html'));
});

app.get('/conversaciones', (req, res) => {
  res.sendFile(path.join(__dirname, '../../src/test-ui/public/conversaciones.html'));
});

app.get('/clientes', (req, res) => {
  res.sendFile(path.join(__dirname, '../../src/test-ui/public/clientes.html'));
});

app.get('/reportes', (req, res) => {
  res.sendFile(path.join(__dirname, '../../src/test-ui/public/reportes.html'));
});

app.get('/unauthorized', (req, res) => {
  res.sendFile(path.join(__dirname, '../../src/test-ui/public/unauthorized.html'));
});

app.get('/chatbot', (req, res) => {
  res.sendFile(path.join(__dirname, '../../src/test-ui/public/chatbot.html'));
});

// Initialize AI Service
const aiService = createIAService();

// Simple in-memory session store for testing
const sessions: Record<string, ConversationContext> = {};

app.post('/api/chat', async (req, res) => {
  try {
    const { message, image, sessionId = 'test_session' } = req.body;

    if (!message && !image) {
      return res.status(400).json({ error: 'Message or image is required' });
    }

    // Initialize session if not exists
    if (!sessions[sessionId]) {
      const sessionResult = await aiService.manageSession(sessionId, 'create');
      if (sessionResult.success && sessionResult.context) {
        sessions[sessionId] = sessionResult.context;
      } else {
        // Fallback context if creation fails
        sessions[sessionId] = {
          sessionId,
          fsmState: 'IDLE',
          history: [],
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 5 * 60 * 1000)
        };
      }
    }

    const context = sessions[sessionId];

    // Ensure Conversation exists in DB
    await pool.query(
      `INSERT INTO conversaciones (session_id, cliente_whatsapp, estado_fsm) 
       VALUES ($1, $2, $3) 
       ON CONFLICT (session_id) DO UPDATE SET estado_fsm = $3, updated_at = CURRENT_TIMESTAMP`,
      [sessionId, sessionId, context.fsmState]
    );

    // Insert user message
    await pool.query(
      `INSERT INTO mensajes (session_id, emisor, contenido) VALUES ($1, $2, $3)`,
      [sessionId, 'user', message]
    );

    // 1. Classify intent
    const intentResult = await aiService.classifyIntent(message, context);

    // Update context with new intent
    context.lastIntent = intentResult.intent;
    context.history.unshift(intentResult);
    if (intentResult.entities['producto']) {
      context.productConsulted = intentResult.entities['producto'];
    }
    if (intentResult.entities['talla']) {
      context.sizeMentioned = intentResult.entities['talla'];
    }
    context.expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    if (image) {
      context.receiptImage = image;
    }

    // 2. Generate response
    const response = await aiService.generateResponse(intentResult.intent, context);

    // CRM Integrations
    const necesitaAsesor = intentResult.intent === 'hablar_humano' || response.requiresHandoff;
    if (necesitaAsesor) {
      await pool.query(`UPDATE conversaciones SET necesita_asesor = TRUE WHERE session_id = $1`, [sessionId]);
    }

    // Insert bot message
    const msgResult = await pool.query(
      `INSERT INTO mensajes (session_id, emisor, contenido) VALUES ($1, $2, $3) RETURNING id`,
      [sessionId, 'bot', response.text]
    );
    const messageId = msgResult.rows[0]?.id;

    // Create Order if completed
    if (context.fsmState === 'IDLE' && context.selectedProduct && context.contactInfo) {
      const orderId = `HLC-${Date.now()}`;
      const isContraentrega = context.selectedPayment === 'Contra entrega';
      const orderState = isContraentrega ? 'Pendiente Despacho' : 'Pendiente Validacion';

      try {
        await pool.query(
          `INSERT INTO pedidos (id, numero_orden, cliente_whatsapp, cliente_nombre, ciudad, direccion, productos, total, metodo_pago, estado, comprobante_url)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           ON CONFLICT DO NOTHING`,
          [orderId, orderId, sessionId, context.contactInfo.split(',')[0] || 'Cliente', context.selectedCity, context.contactInfo, `${context.selectedProduct} (Talla ${context.selectedSize || 'N/A'})`, context.selectedPrice, context.selectedPayment || 'Por validar', orderState, context.receiptImage || null]
        );

        // Clear order fields to avoid infinite order creation loop
        delete context.selectedProduct;
        delete context.selectedPrice;
        delete context.contactInfo;
        delete context.selectedCity;
        delete context.selectedSize;
        delete context.selectedPayment;
        delete context.receiptImage;
      } catch (err) {
        console.error('[CRM] Error saving order:', err);
      }
    }

    return res.json({
      reply: response.text,
      messageId: messageId,
      buttons: response.buttons,
      debug: {
        intent: intentResult.intent,
        confidence: intentResult.confidence,
        entities: intentResult.entities,
        context: context
      }
    });

  } catch (error) {
    console.error('Error processing chat:', error);
    res.status(500).json({ error: 'Internal AI Server Error' });
  }
});

// Endpoint for UI to poll new messages from CRM
app.get('/api/chat/messages', async (req, res) => {
  try {
    const { sessionId, lastId } = req.query;
    if (!sessionId) return res.status(400).json({ error: 'sessionId required' });

    let query = `SELECT id, emisor, contenido, created_at FROM mensajes WHERE session_id = $1 AND emisor = 'bot'`;
    const values: any[] = [sessionId];

    if (lastId) {
      query += ` AND id > $2`;
      values.push(Number(lastId));
    }

    query += ` ORDER BY id ASC`;

    const result = await pool.query(query, values);
    res.json({ success: true, messages: result.rows });
  } catch (err) {
    console.error('Error fetching messages:', err);
    res.status(500).json({ error: 'Error fetching messages' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 HalleyCol AI Test Server running at http://localhost:${PORT}`);
});
