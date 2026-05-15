import { Router, Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'halleycol-super-secret-key-2026';

const router = Router();

// Endpoint de login
router.post('/login', async (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Falta username o password' });
  }

  try {
    const pool: Pool = req.app.locals.pool;
    const userResult = await pool.query('SELECT * FROM usuarios WHERE username = $1', [username]);

    if (userResult.rowCount === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const user = userResult.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    // Enviar el token como una cookie HttpOnly
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 8 * 60 * 60 * 1000 // 8 hours
    });

    res.json({ success: true, user: { username: user.username, role: user.role } });
  } catch (error) {
    console.error('[Auth] Error de login:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Endpoint de logout
router.post('/logout', (req: Request, res: Response) => {
  res.clearCookie('auth_token');
  res.json({ success: true });
});

// Middleware para verificar la sesión
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const token = req.cookies?.auth_token;

  if (!token) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    (req as any).user = payload;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
};

// Middleware para verificar roles específicos
export const requireRole = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: 'No autorizado' });
    }
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ error: 'Acceso denegado: rol no permitido' });
    }
    next();
  };
};

export default router;
