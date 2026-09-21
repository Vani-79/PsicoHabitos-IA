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

let lastLoggedApiUrl: string | null = null;

function logApiConnectionOnce(url: string) {
  if (__DEV__ && lastLoggedApiUrl !== url) {
    lastLoggedApiUrl = url;
    console.log(`Conectado con  la IP: ${url}`);
  }
}

/**
 * Resuelve la URL base de la API backend de forma completamente dinámica:
 * 1. Si EXPO_PUBLIC_API_URL es un túnel público o URL remota (https://, ngrok, loca.lt), tiene máxima prioridad.
 * 2. En producción, utiliza la URL oficial o el valor de EXPO_PUBLIC_API_URL.
 * 3. En dispositivos móviles (iOS/Android en Expo Go o dev client), resuelve la IP dinámica actual del equipo desde Metro en tiempo real.
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
    logApiConnectionOnce(envUrl);
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
        logApiConnectionOnce(url);
        return url;
      }
    }
    const defaultWebUrl = 'http://localhost:3000/api';
    logApiConnectionOnce(defaultWebUrl);
    return defaultWebUrl;
  }

  // 4. Dispositivos móviles (iOS / Android) en desarrollo: IP dinámica desde Metro
  const devHostIp = getHostIpFromExpo();
  if (devHostIp) {
    const url = `http://${devHostIp}:3000/api`;
    logApiConnectionOnce(url);
    return url;
  }

  // 5. Fallback a variable de entorno si tiene una URL configurada
  if (envUrl && envUrl !== 'http://localhost:3000/api') {
    logApiConnectionOnce(envUrl);
    return envUrl;
  }

  // 6. Emulador Android (10.0.2.2 apunta al localhost de la máquina anfitriona)
  if (Platform.OS === 'android') {
    const url = 'http://10.0.2.2:3000/api';
    logApiConnectionOnce(url);
    return url;
  }

  // 7. Fallback local estándar (Simulador iOS o localhost)
  const defaultLocalUrl = 'http://localhost:3000/api';
  logApiConnectionOnce(defaultLocalUrl);
  return defaultLocalUrl;
}

export const API_CONFIG = {
  get BASE_URL() {
    return getApiBaseUrl();
  },
  TIMEOUT_MS: 10000,
};

let currentToken: string | null = null;

export const authSession = {
  getToken(): string | null {
    return currentToken;
  },
  setToken(token: string | null): void {
    currentToken = token;
  },
  clearToken(): void {
    currentToken = null;
  },
};

/**
 * Realiza peticiones HTTP adjuntando automáticamente el encabezado Authorization: Bearer <token>
 */
export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const token = authSession.getToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return fetch(url, {
    ...options,
    headers,
  });
}

/**
 * Simula una pequeña latencia de red para emular comportamiento asíncrono real en desarrollo.
 */
export const simulateNetworkDelay = (ms: number = 200): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

