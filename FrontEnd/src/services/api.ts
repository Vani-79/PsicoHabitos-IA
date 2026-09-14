import { Platform, NativeModules } from 'react-native';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Resuelve la URL base de la API backend:
 * 1. Variable de entorno EXPO_PUBLIC_API_URL si está definida (configurable en .env).
 * 2. En producción, fallback garantizado bajo HTTPS seguro.
 * 3. En dispositivos móviles (Expo Go en iOS/Android), resuelve la IP de la máquina anfitriona
 *    desde la conexión del bundler Metro (NativeModules.SourceCode.scriptURL) para desarrollo local.
 * 4. Fallback a localhost para emuladores y desarrollo web.
 */
export function getApiBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // En producción, garantizar siempre el uso de HTTPS seguro
  if (process.env.NODE_ENV === 'production') {
    return 'https://api.psicohabitos.com/api';
  }

  // En dispositivos móviles (Expo Go en iOS/Android), extrae la IP de la máquina anfitriona
  // desde la conexión de Metro de forma dinámica para desarrollo local.
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    const scriptURL = NativeModules?.SourceCode?.scriptURL;
    if (scriptURL) {
      const withoutProto = scriptURL.split('://')[1] || '';
      const hostPart = withoutProto.split('/')[0] || '';
      const hostIp = hostPart.split(':')[0];
      if (hostIp && hostIp !== 'localhost' && hostIp !== '127.0.0.1') {
        const devProtocol = __DEV__ ? 'http' : 'https';
        return `${devProtocol}://${hostIp}:3000/api`;
      }
    }
  }

  // Fallback para emulador local o navegador web (localhost está exento de riesgo de red externa)
  return 'http://localhost:3000/api';
}

export const API_CONFIG = {
  get BASE_URL() {
    return getApiBaseUrl();
  },
  TIMEOUT_MS: 10000,
};

/**
 * Simula una pequeña latencia de red para emular comportamiento asíncrono real en desarrollo.
 */
export const simulateNetworkDelay = (ms: number = 200): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};
