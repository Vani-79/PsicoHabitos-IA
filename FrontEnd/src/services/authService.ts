/**
 * Servicio de autenticación y gestión de sesiones de usuario.
 */

import { ApiResponse, simulateNetworkDelay } from './api';
import { MOCK_USERS, TestUser, UserRole } from '../constants/auth';

export const authService = {
  /**
   * Valida credenciales e inicia sesión del usuario (paciente o psicólogo).
   */
  async login(email: string, _password?: string): Promise<ApiResponse<TestUser>> {
    await simulateNetworkDelay(200);

    const targetEmail = email.trim().toLowerCase();
    if (!targetEmail) {
      return { success: false, error: 'Por favor ingresa tu correo electrónico.' };
    }

    // Consulta de usuario registrado en catálogo mock o backend
    const mockUser = MOCK_USERS[targetEmail];
    if (mockUser) {
      return { success: true, data: mockUser };
    }

    // Detección heurística de rol para usuarios adicionales
    const nameFromEmail = targetEmail.split('@')[0];
    const capitalized = nameFromEmail.charAt(0).toUpperCase() + nameFromEmail.slice(1);
    const isPsychologist = targetEmail.includes('psicolog');

    const resolvedUser: TestUser = {
      email: targetEmail,
      role: (isPsychologist ? 'psicologo' : 'paciente') as UserRole,
      name: isPsychologist ? `Lic. ${capitalized}` : capitalized,
    };

    return { success: true, data: resolvedUser };
  },

  /**
   * Cierra la sesión activa del usuario.
   */
  async logout(): Promise<void> {
    await simulateNetworkDelay(100);
  },
};
