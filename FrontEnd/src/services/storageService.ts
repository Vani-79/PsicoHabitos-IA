import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { UserRole } from '../constants/auth';

const KEY_REMEMBERED_EMAIL = 'psicohabitos_remembered_email';
const KEY_USER_SESSION = 'psicohabitos_user_session';

export interface StoredSession {
  email: string;
  role: UserRole;
  name: string;
  token?: string;
  rememberMe: boolean;
}

/**
 * Helper para almacenar de forma segura (Keychain en iOS, Keystore en Android, localStorage en Web)
 */
async function setItem(key: string, value: string): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
      return;
    }
    await SecureStore.setItemAsync(key, value);
  } catch (error) {
    console.warn(`[storageService] Error guardando ${key}:`, error);
  }
}

/**
 * Helper para leer del almacenamiento seguro
 */
async function getItem(key: string): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
      return null;
    }
    return await SecureStore.getItemAsync(key);
  } catch (error) {
    console.warn(`[storageService] Error leyendo ${key}:`, error);
    return null;
  }
}

/**
 * Helper para eliminar del almacenamiento seguro
 */
async function deleteItem(key: string): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
      return;
    }
    await SecureStore.deleteItemAsync(key);
  } catch (error) {
    console.warn(`[storageService] Error eliminando ${key}:`, error);
  }
}

export const storageService = {
  /**
   * Guarda el correo del usuario para rellenarlo automáticamente al abrir la pantalla de login.
   */
  async saveRememberedEmail(email: string): Promise<void> {
    await setItem(KEY_REMEMBERED_EMAIL, email.trim().toLowerCase());
  },

  /**
   * Obtiene el correo recordado si existe.
   */
  async getRememberedEmail(): Promise<string | null> {
    return await getItem(KEY_REMEMBERED_EMAIL);
  },

  /**
   * Elimina el correo recordado.
   */
  async clearRememberedEmail(): Promise<void> {
    await deleteItem(KEY_REMEMBERED_EMAIL);
  },

  /**
   * Guarda la sesión completa del usuario para permitir Auto-Login persistente.
   */
  async saveUserSession(session: StoredSession): Promise<void> {
    await setItem(KEY_USER_SESSION, JSON.stringify(session));
  },

  /**
   * Recupera la sesión guardada para reanudarla automáticamente al lanzar la app.
   */
  async getUserSession(): Promise<StoredSession | null> {
    const raw = await getItem(KEY_USER_SESSION);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as StoredSession;
    } catch {
      return null;
    }
  },

  /**
   * Elimina la sesión activa al cerrar sesión.
   */
  async clearUserSession(): Promise<void> {
    await deleteItem(KEY_USER_SESSION);
  },

  /**
   * Limpia completamente todos los datos guardados (sesión y correo recordado).
   */
  async clearAll(): Promise<void> {
    await deleteItem(KEY_REMEMBERED_EMAIL);
    await deleteItem(KEY_USER_SESSION);
  },
};

