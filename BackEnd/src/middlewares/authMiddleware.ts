import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload } from '../config/jwt';
import { pool } from '../config/db';
import { RowDataPacket } from 'mysql2';

// Extender la interfaz Request de Express para incluir req.user tipado
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

/**
 * Middleware que verifica la presencia y validez del token JWT en el encabezado Authorization.
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({
      success: false,
      error: 'Acceso no autorizado: No se proporcionó el token de sesión (Authorization Bearer).',
    });
    return;
  }

  const parts = authHeader.trim().split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    res.status(401).json({
      success: false,
      error: 'Formato de token no válido. Debe tener la estructura: Bearer <token>',
    });
    return;
  }

  const token = parts[1];
  const payload = verifyToken(token);

  if (!payload) {
    res.status(401).json({
      success: false,
      error: 'Token de sesión inválido o expirado. Por favor vuelve a iniciar sesión.',
    });
    return;
  }

  req.user = payload;
  next();
}

/**
 * Middleware de control de acceso basado en roles (RBAC).
 */
export function requireRole(...allowedRoles: Array<'psicologo' | 'paciente' | 'admin'>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Sesión no autenticada.',
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: `Acceso restringido: Se requiere rol [${allowedRoles.join(', ')}]. Tu rol actual es "${req.user.role}".`,
      });
      return;
    }

    next();
  };
}

/**
 * Middleware Trigger Unificado de Suscripción:
 * Bloquea cualquier acción de escritura, creación o visualización de hábitos
 * si la suscripción del especialista no está activa o se encuentra vencida.
 */
export async function requireActiveSubscription(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Sesión no autenticada.' });
    return;
  }

  // Si no es psicólogo (ej. admin o paciente), no se aplica restricción de suscripción de especialista
  if (req.user.role !== 'psicologo') {
    next();
    return;
  }

  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT suscripcion_activa, suscripcion_fin,
              (suscripcion_fin >= NOW() AND suscripcion_activa = 1) AS is_valid
       FROM psicologos
       WHERE usuario_id = ?
       LIMIT 1`,
      [req.user.userId]
    );

    if (rows.length === 0 || !rows[0].is_valid) {
      res.status(403).json({
        success: false,
        error: 'Suscripción Finalizada comuníquese con el administrador para renovarla',
        subscriptionExpired: true,
      });
      return;
    }

    next();
  } catch (err) {
    console.error('[requireActiveSubscription] Error validando suscripción:', err);
    res.status(500).json({ success: false, error: 'Error interno verificando estado de suscripción.' });
  }
}

