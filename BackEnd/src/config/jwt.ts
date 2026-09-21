import jwt, { SignOptions } from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const DEFAULT_DEV_SECRET = 'psicohabitos_dev_fallback_secret_clinical_2026_!@#';

export const JWT_SECRET = process.env.JWT_SECRET || DEFAULT_DEV_SECRET;
export const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || '7d') as string;

if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('❌ [Seguridad] JWT_SECRET es obligatorio en producción. Por favor configúralo en el archivo .env');
}

export interface TokenPayload {
  userId: number;
  email: string;
  role: 'psicologo' | 'paciente' | 'admin';
}

/**
 * Genera un token JWT firmado para la sesión de un usuario.
 */
export function generateToken(payload: TokenPayload): string {
  const options: SignOptions = {
    expiresIn: JWT_EXPIRES_IN as any,
    issuer: 'psicohabitos-api',
  };

  return jwt.sign(payload, JWT_SECRET, options);
}

/**
 * Verifica y decodifica un token JWT. Retorna el payload o null si es inválido/expirado.
 */
export function verifyToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'psicohabitos-api',
    }) as TokenPayload;
    return decoded;
  } catch {
    return null;
  }
}
