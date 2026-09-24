/**
 * Servicio de autenticación conectado a la API REST MySQL con detección de creación de contraseña inicial.
 */

import { API_CONFIG, ApiResponse, authSession, fetchWithAuth } from './api';
import { MOCK_USERS, TestUser, UserRole, PsychologistProfileData } from '../constants/auth';

export interface RoleOptionInfo {
  role: UserRole;
  title: string;
  subtitle: string;
  name: string;
}

export interface AuthLoginResponse extends ApiResponse<TestUser> {
  requiresPasswordCreation?: boolean;
  requiresRoleSelection?: boolean;
  availableRoles?: UserRole[];
  rolesInfo?: RoleOptionInfo[];
}

export interface CheckEmailResponse {
  success: boolean;
  exists: boolean;
  requiresPasswordCreation: boolean;
  role?: UserRole;
  availableRoles?: UserRole[];
  hasMultipleRoles?: boolean;
  name?: string;
  error?: string;
}

export interface ForgotPasswordResponse {
  success: boolean;
  message?: string;
  error?: string;
  email?: string;
  data?: TestUser;
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

      const json = await response.json().catch(() => null);

      if (response.ok && json) {
        return json;
      }

      return {
        success: false,
        exists: false,
        requiresPasswordCreation: false,
        error: json?.error || 'Error al verificar el correo electrónico.',
      };
    } catch (err) {
      console.warn('[authService] Error al verificar email en backend:', err);
      // Fallback local en desarrollo sólo si el usuario existe en mocks de prueba
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

      return {
        success: false,
        exists: false,
        requiresPasswordCreation: false,
        error: 'No se pudo conectar con el servidor. Revisa tu conexión de red.',
      };
    }
  },

  /**
   * Valida credenciales e inicia sesión del usuario (paciente o psicólogo).
   * Si el usuario no tiene contraseña creada, retorna requiresPasswordCreation: true.
   */
  async login(email: string, password?: string, selectedRole?: UserRole): Promise<AuthLoginResponse> {
    const targetEmail = email.trim().toLowerCase();
    const cleanPassword = password ? password.trim() : '';

    if (!targetEmail) {
      return { success: false, error: 'Por favor ingresa tu correo electrónico.' };
    }

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail, password: cleanPassword, selectedRole }),
      });

      const json = await response.json().catch(() => null);

      if (json?.requiresPasswordCreation) {
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

      if (json?.requiresRoleSelection) {
        return {
          success: true,
          requiresRoleSelection: true,
          availableRoles: json.availableRoles,
          rolesInfo: json.rolesInfo,
          data: {
            email: json.email,
            role: json.availableRoles?.[0] || 'psicologo',
            name: json.rolesInfo?.[0]?.name || 'Usuario',
            availableRoles: json.availableRoles,
            hasMultipleRoles: true,
          },
        };
      }

      if (response.ok && json) {
        if (json.data?.token) {
          authSession.setToken(json.data.token);
        }
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
        name: isPsychologist ? `Ps. ${capitalized}` : capitalized,
      },
    };
  },

  /**
   * Cambia el portal activo (especialista <-> paciente) sin cerrar sesión.
   */
  async switchRole(targetRole: UserRole): Promise<AuthLoginResponse> {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/auth/switch-role`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authSession.getToken() ? { Authorization: `Bearer ${authSession.getToken()}` } : {}),
        },
        body: JSON.stringify({ targetRole }),
      });

      const json = await response.json().catch(() => null);

      if (response.ok && json && json.success) {
        if (json.data?.token) {
          authSession.setToken(json.data.token);
        }
        return json;
      }

      return {
        success: false,
        error: json?.error || 'No se pudo cambiar de portal.',
      };
    } catch (err) {
      console.warn('[authService] Error al cambiar de rol en backend:', err);
      return {
        success: false,
        error: 'Error de conexión al cambiar de portal.',
      };
    }
  },

  /**
   * Crea la contraseña inicial para un usuario registrado sin contraseña e inicia sesión directamente.
   */
  async createInitialPassword(
    email: string,
    password: string,
    acceptedTerms: boolean = true
  ): Promise<ApiResponse<TestUser>> {
    const targetEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/auth/create-initial-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: targetEmail,
          password: cleanPassword,
          acceptedTerms,
        }),
      });

      const json = await response.json().catch(() => null);

      if (response.ok && json?.success) {
        if (json.data?.token) {
          authSession.setToken(json.data.token);
        }
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
   * Envía un código de 6 dígitos al correo para iniciar recuperación de contraseña.
   */
  async sendPasswordResetCode(email: string): Promise<ForgotPasswordResponse> {
    const targetEmail = email.trim().toLowerCase();
    if (!targetEmail) {
      return { success: false, error: 'Por favor ingresa tu correo electrónico.' };
    }

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/auth/forgot-password/send-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail }),
      });

      const json = await response.json().catch(() => null);
      if (response.ok && json?.success) {
        return json;
      }
      return {
        success: false,
        error: json?.error || 'No se pudo enviar el código de recuperación.',
      };
    } catch (err) {
      console.warn('[authService] Error en sendPasswordResetCode:', err);
      const mockUser = MOCK_USERS[targetEmail];
      if (mockUser) {
        return {
          success: true,
          message: 'Código de prueba enviado: 123456',
          email: targetEmail,
        };
      }
      return {
        success: false,
        error: 'No se pudo conectar con el servidor para enviar el código.',
      };
    }
  },

  /**
   * Valida que el código de 6 dígitos ingresado sea correcto y vigente.
   */
  async verifyPasswordResetCode(email: string, code: string): Promise<ForgotPasswordResponse> {
    const targetEmail = email.trim().toLowerCase();
    const cleanCode = code.trim();

    if (!targetEmail || !cleanCode) {
      return { success: false, error: 'Correo y código son requeridos.' };
    }

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/auth/forgot-password/verify-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail, code: cleanCode }),
      });

      const json = await response.json().catch(() => null);
      if (response.ok && json?.success) {
        return json;
      }
      return {
        success: false,
        error: json?.error || 'El código de verificación es inválido o ha expirado.',
      };
    } catch (err) {
      console.warn('[authService] Error en verifyPasswordResetCode:', err);
      if (cleanCode === '123456') {
        return { success: true, message: 'Código verificado correctamente.' };
      }
      return {
        success: false,
        error: 'No se pudo conectar con el servidor para verificar el código.',
      };
    }
  },

  /**
   * Restablece la contraseña del usuario tras haber validado el código de 6 dígitos.
   */
  async resetPassword(
    email: string,
    code: string,
    newPassword: string
  ): Promise<ApiResponse<TestUser>> {
    const targetEmail = email.trim().toLowerCase();
    const cleanCode = code.trim();
    const cleanPassword = newPassword.trim();

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/auth/forgot-password/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: targetEmail,
          code: cleanCode,
          newPassword: cleanPassword,
        }),
      });

      const json = await response.json().catch(() => null);
      if (response.ok && json?.success) {
        if (json.data?.token) {
          authSession.setToken(json.data.token);
        }
        return json;
      }
      return {
        success: false,
        error: json?.error || 'Error al restablecer la contraseña.',
      };
    } catch (err) {
      console.warn('[authService] Error en resetPassword:', err);
      return {
        success: false,
        error: 'No se pudo conectar con el servidor para restablecer la contraseña.',
      };
    }
  },

  /**
   * Envía un código de confirmación de 6 dígitos para la activación de un usuario nuevo.
   */
  async sendActivationCode(email: string): Promise<ForgotPasswordResponse> {
    const targetEmail = email.trim().toLowerCase();
    if (!targetEmail) {
      return { success: false, error: 'Por favor ingresa tu correo electrónico.' };
    }

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/auth/activation/send-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail }),
      });

      const json = await response.json().catch(() => null);
      if (response.ok && json?.success) {
        return json;
      }
      return {
        success: false,
        error: json?.error || 'No se pudo enviar el código de confirmación.',
      };
    } catch (err) {
      console.warn('[authService] Error en sendActivationCode:', err);
      return {
        success: false,
        error: 'No se pudo conectar con el servidor para enviar el código de activación.',
      };
    }
  },

  /**
   * Valida el código de confirmación de 6 dígitos para la activación de un usuario nuevo.
   */
  async verifyActivationCode(email: string, code: string): Promise<ForgotPasswordResponse> {
    const targetEmail = email.trim().toLowerCase();
    const cleanCode = code.trim();

    if (!targetEmail || !cleanCode) {
      return { success: false, error: 'Correo y código son requeridos.' };
    }

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/auth/activation/verify-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail, code: cleanCode }),
      });

      const json = await response.json().catch(() => null);
      if (response.ok && json?.success) {
        return json;
      }
      return {
        success: false,
        error: json?.error || 'El código de confirmación es inválido o ha expirado.',
      };
    } catch (err) {
      console.warn('[authService] Error en verifyActivationCode:', err);
      if (cleanCode === '123456') {
        return { success: true, message: 'Código verificado correctamente (modo offline).' };
      }
      return {
        success: false,
        error: 'No se pudo conectar con el servidor para verificar el código.',
      };
    }
  },

  /**
   * Obtiene la información del perfil del psicólogo autenticado desde MySQL.
   */
  async getPsychologistProfile(): Promise<PsychologistProfileData | null> {
    try {
      const response = await fetchWithAuth(`${API_CONFIG.BASE_URL}/auth/psychologist-profile`);
      if (response.ok) {
        const json = await response.json();
        if (json.success && json.data) {
          return json.data;
        }
      }
    } catch (err) {
      console.warn('[authService] Error obteniendo perfil del especialista:', err);
    }
    return null;
  },

  /**
   * Cierra la sesión activa del usuario.
   */
  async logout(): Promise<void> {
    authSession.clearToken();
  },
};
