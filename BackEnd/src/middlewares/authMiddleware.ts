import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload } from '../config/jwt';

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
