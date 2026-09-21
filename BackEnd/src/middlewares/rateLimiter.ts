import rateLimit from 'express-rate-limit';

/**
 * Limitador general para la API para mitigar saturación y ataques DoS.
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 300, // Máximo 300 solicitudes por ventana por IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Has superado el límite de solicitudes permitidas. Por favor inténtalo de nuevo más tarde.',
  },
});

/**
 * Limitador estricto para intentos de autenticación y solicitudes de códigos.
 * Previene ataques de fuerza bruta y saturación de SMTP.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 15, // Máximo 15 intentos por IP cada 15 min
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Demasiados intentos de acceso o solicitudes de código. Por seguridad, espera 15 minutos.',
  },
});

/**
 * Limitador ultra estricto para la verificación de códigos OTP de 6 dígitos.
 * Previene ataques de fuerza bruta sobre el espacio de 1.000.000 de códigos.
 */
export const otpVerificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // Máximo 5 intentos fallidos
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Demasiados intentos fallidos de verificación de código. Bloqueado temporalmente por 15 minutos.',
  },
});
