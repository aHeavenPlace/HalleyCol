import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import multer from 'multer';
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
const isRemote = process.env.PGHOST && !process.env.PGHOST.includes('localhost');

const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: Number(process.env.PGPORT) || 5432,
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || '12345678',
  database: process.env.PGDATABASE || 'vekas_db',
  ssl: isRemote ? true : false, // SSL solo para bases de datos remotas (Render)
});

pool.on('error', (err) => {
  console.error('[DB Pool] Unexpected error', err);
});

app.locals.pool = pool;

app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Servir archivos subidos (comprobantes de pago)
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

// Configurar multer para guardar imágenes de comprobantes
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `comprobante_${Date.now()}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Solo se permiten imágenes (jpg, png, webp, gif)'));
  }
});

// Endpoint de subida de comprobante
app.post('/api/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No se recibió ningún archivo' });
    const url = `/uploads/${req.file.filename}`;
    console.log('[Upload] Comprobante guardado:', url);

    // Vincular comprobante al pedido pendiente del cliente (subconsulta para LIMIT en UPDATE)
    const { sessionId } = req.body;
    if (sessionId) {
      try {
        await pool.query(
          `UPDATE pedidos SET comprobante_url = $1
           WHERE id = (
             SELECT id FROM pedidos
             WHERE cliente_whatsapp = $2
               AND estado = 'Pendiente Validacion'
               AND comprobante_url IS NULL
             ORDER BY created_at DESC
             LIMIT 1
           )`,
          [url, sessionId]
        );
        console.log('[Upload] Comprobante vinculado al pedido de sesión:', sessionId);
      } catch (err) {
        console.error('[Upload] No se pudo vincular comprobante al pedido:', err);
        // No fallar el upload si la vinculación falla (ej: columna no existe todavía)
      }
    }

    res.json({ success: true, url });
  } catch (err) {
    console.error('[Upload] Error general:', err);
    res.status(500).json({ error: 'Error al procesar la imagen' });
  }
});

// Mount routers
app.use('/api/auth', authRoutes);
app.use('/api/crm', crmRoutes);

// Rutas de páginas estáticas
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/login.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/login.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/dashboard.html'));
});

app.get('/dashboard-logistica', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/dashboard-logistica.html'));
});

app.get('/dashboard-asesor', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/dashboard-asesor.html'));
});

app.get('/productos', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/productos.html'));
});

app.get('/pedidos', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/pedidos.html'));
});

app.get('/conversaciones', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/conversaciones.html'));
});

app.get('/clientes', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/clientes.html'));
});

app.get('/reportes', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/reportes.html'));
});

app.get('/usuarios', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/usuarios.html'));
});

app.get('/unauthorized', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/unauthorized.html'));
});

app.get('/chatbot', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/chatbot.html'));
});

// Initialize AI Service
const aiService = createIAService();

// Simple in-memory session store for testing
const sessions: Record<string, ConversationContext> = {};

app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const { message, sessionId = 'test_session', imageUrl } = req.body;

    console.log('[Chat] Request received:', { message, sessionId, hasImage: !!imageUrl });

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
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
    if (imageUrl) {
      (context as any).imageUrl = imageUrl;
    }

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

    // Evitar que el clasificador crashee si el mensaje es undefined (ej: solo imagen)
    const textToClassify = message || '';

    // 1. Classify intent
    const intentResult = await aiService.classifyIntent(textToClassify, context);

    // Update context with new intent
    context.lastIntent = intentResult.intent;
    context.history.unshift(intentResult);
    if (intentResult.entities['producto']) {
      (context as any).productConsulted = intentResult.entities['producto'];
    }
    if (intentResult.entities['talla']) {
      (context as any).sizeMentioned = intentResult.entities['talla'];
    }
    context.expiresAt = new Date(Date.now() + 5 * 60 * 1000);

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
    const ctx = context as any;
    if (context.fsmState === 'IDLE' && ctx.selectedProduct && ctx.contactInfo) {
      const orderId = `VK-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const isContraentrega = ctx.selectedPayment === 'Contra entrega';
      const orderState = isContraentrega ? 'Pendiente Despacho' : 'Pendiente Validacion';

      try {
        await pool.query(
          `INSERT INTO pedidos (id, numero_orden, cliente_whatsapp, cliente_nombre, ciudad, direccion, productos, total, metodo_pago, estado, comprobante_url)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            orderId, 
            orderId, 
            sessionId, 
            (ctx.contactInfo || 'Cliente').split(',')[0].trim(), 
            ctx.selectedCity || 'No especificada', 
            ctx.contactInfo || 'Sin dirección', 
            `${ctx.selectedProduct} (Talla ${ctx.selectedSize || 'N/A'})`, 
            ctx.selectedPrice || 0, 
            ctx.selectedPayment || 'Por validar', 
            orderState,
            ctx.imageUrl || null
          ]
        );

        console.log('[CRM] ✅ Pedido registrado en la base de datos:', orderId);

        // Clear order fields to avoid infinite order creation loop
        delete ctx.selectedProduct;
        delete ctx.selectedPrice;
        delete ctx.contactInfo;
        delete ctx.selectedCity;
        delete ctx.selectedSize;
        delete ctx.selectedPayment;
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
    console.error('[Chat] Error processing chat:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : String(error);
    console.error('[Chat] Error details:', {
      message: errorMessage,
      stack: errorStack,
      code: (error as any)?.code
    });
    res.status(500).json({ error: 'Internal AI Server Error', details: process.env.NODE_ENV === 'development' ? errorMessage : undefined });
  }
});

// Endpoint for UI to poll new messages from CRM
app.get('/api/chat/messages', async (req: Request, res: Response) => {
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
  console.log(`🚀 Vekas AI Test Server running at http://localhost:${PORT}`);
});
