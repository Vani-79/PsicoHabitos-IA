/**
 * Configuración base y contratos de respuesta para la capa de servicios de API.
 */

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export const API_CONFIG = {
  // Variable de entorno de Expo o fallback de desarrollo local
  BASE_URL: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api',
  TIMEOUT_MS: 10000,
};

/**
 * Simula una pequeña latencia de red para emular comportamiento asíncrono real en desarrollo.
 */
export const simulateNetworkDelay = (ms: number = 200): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};
