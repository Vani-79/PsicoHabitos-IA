/**
 * Servicio de autenticación conectado a la API REST MySQL con detección de creación de contraseña inicial.
 */

import { API_CONFIG, ApiResponse } from './api';
import { MOCK_USERS, TestUser, UserRole } from '../constants/auth';

export interface AuthLoginResponse extends ApiResponse<TestUser> {
  requiresPasswordCreation?: boolean;
}

export interface CheckEmailResponse {
  success: boolean;
  exists: boolean;
  requiresPasswordCreation: boolean;
  role?: UserRole;
  name?: string;
  error?: string;
}

export const authService = {
  /**
   * Comprueba si un correo electrónico existe y si requiere creación de contraseña por primera vez.
   */
  async checkEmail(email: string): Promise<CheckEmailResponse> {
    const targetEmail = email.trim().toLowerCase();
    if (!targetEmail) {
      return { success: false, exists: false, requiresPasswordCreation: false };
    }

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/auth/check-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail }),
      });

      if (response.ok) {
        const json = await response.json();
        return json;
      }
    } catch (err) {
      console.warn('[authService] Error al verificar email en backend:', err);
    }

    // Fallback local en desarrollo
    const mockUser = MOCK_USERS[targetEmail];
    if (mockUser) {
      return {
        success: true,
        exists: true,
        requiresPasswordCreation: false,
        role: mockUser.role,
        name: mockUser.name,
      };
    }

    return { success: true, exists: false, requiresPasswordCreation: false };
  },

  /**
   * Valida credenciales e inicia sesión del usuario (paciente o psicólogo).
   * Si el usuario no tiene contraseña creada, retorna requiresPasswordCreation: true.
   */
  async login(email: string, password?: string): Promise<AuthLoginResponse> {
    const targetEmail = email.trim().toLowerCase();
    const cleanPassword = password ? password.trim() : '';

    if (!targetEmail) {
      return { success: false, error: 'Por favor ingresa tu correo electrónico.' };
    }

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail, password: cleanPassword }),
      });

      const json = await response.json().catch(() => null);

      if (json && json.requiresPasswordCreation) {
        return {
          success: false,
          requiresPasswordCreation: true,
          error: json.message,
          data: {
            email: json.email,
            role: json.role,
            name: json.name,
          },
        };
      }

      if (response.ok && json) {
        return json;
      } else {
        return { success: false, error: json?.error || 'Credenciales incorrectas o incompletas.' };
      }
    } catch (err) {
      console.warn('[authService] Backend no alcanzable, usando autenticación local de desarrollo:', err);
    }

    // Fallback local con catálogo mock
    const mockUser = MOCK_USERS[targetEmail];
    if (mockUser) {
      return { success: true, data: mockUser };
    }

    const nameFromEmail = targetEmail.split('@')[0];
    const capitalized = nameFromEmail.charAt(0).toUpperCase() + nameFromEmail.slice(1);
    const isPsychologist = targetEmail.includes('psicolog') || targetEmail.includes('roberto');

    return {
      success: true,
      data: {
        email: targetEmail,
        role: (isPsychologist ? 'psicologo' : 'paciente') as UserRole,
        name: isPsychologist ? `Dr. ${capitalized}` : capitalized,
      },
    };
  },

  /**
   * Crea la contraseña inicial para un usuario registrado sin contraseña e inicia sesión directamente.
   */
  async createInitialPassword(email: string, password: string): Promise<ApiResponse<TestUser>> {
    const targetEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/auth/create-initial-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail, password: cleanPassword }),
      });

      const json = await response.json().catch(() => null);

      if (response.ok && json && json.success) {
        return json;
      } else {
        return {
          success: false,
          error: json?.error || 'Error al guardar la contraseña inicial.',
        };
      }
    } catch (err) {
      console.warn('[authService] Error al crear contraseña en backend:', err);
      return {
        success: false,
        error: 'No se pudo conectar con el servidor para crear tu contraseña.',
      };
    }
  },

  /**
   * Cierra la sesión activa del usuario.
   */
  async logout(): Promise<void> {
    // Listo para invalidar token o limpiar almacenamiento local
  },
};
