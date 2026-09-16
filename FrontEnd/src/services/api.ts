import { Platform, NativeModules } from 'react-native';
import Constants from 'expo-constants';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Resuelve la IP local de la máquina de desarrollo de forma robusta para Android e iOS.
 */
function getHostIpFromExpo(): string | null {
  // 1. En Expo Go (Android/iOS), hostUri contiene "IP:PUERTO" de la máquina Metro
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip && ip !== 'localhost' && ip !== '127.0.0.1' && !ip.includes('exp.direct')) {
      return ip;
    }
  }

  // 2. Extraer desde manifest2 o debuggerHost tradicional de Expo
  const manifest = Constants.manifest2 as any;
  const debuggerHost =
    manifest?.extra?.expoGo?.debuggerHost ||
    (Constants as any).manifest?.debuggerHost;
  if (debuggerHost) {
    const ip = String(debuggerHost).split(':')[0];
    if (ip && ip !== 'localhost' && ip !== '127.0.0.1' && !ip.includes('exp.direct')) {
      return ip;
    }
  }

  // 3. Fallback a NativeModules.SourceCode.scriptURL
  const scriptURL = NativeModules?.SourceCode?.scriptURL;
  if (scriptURL) {
    const withoutProto = scriptURL.split('://')[1] || '';
    const hostPart = withoutProto.split('/')[0] || '';
    const ip = hostPart.split(':')[0];
    if (ip && ip !== 'localhost' && ip !== '127.0.0.1' && !ip.includes('exp.direct')) {
      return ip;
    }
  }

  return null;
}

/**
 * Resuelve la URL base de la API backend de forma completamente dinámica:
 * 1. Si EXPO_PUBLIC_API_URL es un túnel público o URL remota (https://, ngrok, loca.lt), tiene máxima prioridad.
 * 2. En producción, utiliza la URL oficial o el valor de EXPO_PUBLIC_API_URL.
 * 3. En dispositivos móviles (iOS/Android en Expo Go o dev client), resuelve la IP dinámica actual de la Mac desde Metro en tiempo real.
 * 4. En Web, utiliza window.location.hostname para sincronizarse automáticamente con el host desde el que se abrió.
 * 5. En emulador Android sin host detectable, recurre a 10.0.2.2.
 * 6. Fallback a localhost:3000.
 */
export function getApiBaseUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

  // 1. Prioridad: túnel público explícito o servidor HTTPS remoto
  if (
    envUrl &&
    (envUrl.startsWith('https://') ||
      envUrl.includes('.ngrok') ||
      envUrl.includes('.loca.lt') ||
      envUrl.includes('.trycloudflare.com'))
  ) {
    if (__DEV__) {
      console.log(`📡 [API] Usando túnel/backend remoto: ${envUrl}`);
    }
    return envUrl;
  }

  // 2. Modo producción
  if (process.env.NODE_ENV === 'production') {
    return envUrl || 'https://api.psicohabitos.com/api';
  }

  // 3. Web en desarrollo: sincronizar dinámicamente con el hostname del navegador
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.location?.hostname) {
      const hostname = window.location.hostname;
      const protocol = window.location.protocol || 'http:';
      if (hostname && hostname !== 'localhost' && hostname !== '127.0.0.1') {
        const url = `${protocol}//${hostname}:3000/api`;
        if (__DEV__) console.log(`📡 [API Web Dinámica] Conectando a: ${url}`);
        return url;
      }
    }
    return 'http://localhost:3000/api';
  }

  // 4. Dispositivos móviles (iOS / Android) en desarrollo: IP dinámica desde Metro
  const devHostIp = getHostIpFromExpo();
  if (devHostIp) {
    const url = `http://${devHostIp}:3000/api`;
    if (__DEV__) {
      console.log(`📡 [API Dinámica] Conectando a la IP detectada de tu Mac: ${url}`);
    }
    return url;
  }

  // 5. Fallback a variable de entorno si tiene una URL configurada
  if (envUrl && envUrl !== 'http://localhost:3000/api') {
    return envUrl;
  }

  // 6. Emulador Android (10.0.2.2 apunta al localhost de la máquina anfitriona)
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3000/api';
  }

  // 7. Fallback local estándar (Simulador iOS o localhost)
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
