/**
 * Servicio de seguimiento y registro de hábitos diarios del paciente conectado a MySQL vía REST.
 * Proporciona validación robusta y bloqueo del registro según la fecha del servidor de base de datos.
 */

import { API_CONFIG, ApiResponse, fetchWithAuth } from './api';
import { MySqlDailyHabitRecord } from '../types/habits';

export interface TodayHabitStatus {
  success: boolean;
  completedToday: boolean;
  isLocked: boolean;
  serverDate: string;
  nextDate?: string;
  message?: string;
  record?: MySqlDailyHabitRecord | null;
  error?: string;
}

let localHabitsFallback: MySqlDailyHabitRecord[] = [];

export const habitService = {
  /**
   * Consulta el estado de hábitos de hoy en el servidor (MySQL CURDATE()).
   * Determina si el paciente ya completó su registro diario y bloquea edición hasta el día siguiente.
   */
  async getTodayStatus(userId: string): Promise<TodayHabitStatus> {
    if (!userId) {
      return {
        success: false,
        completedToday: false,
        isLocked: false,
        serverDate: new Date().toISOString().split('T')[0],
      };
    }

    try {
      const response = await fetchWithAuth(
        `${API_CONFIG.BASE_URL}/habits/today-status?userId=${encodeURIComponent(userId)}`
      );

      if (response.ok) {
        const json = await response.json();
        return json;
      }
    } catch (err) {
      console.warn('[habitService] Error consultando today-status en backend:', err);
    }

    // Fallback local en desarrollo si el servidor no responde
    const todayStr = new Date().toISOString().split('T')[0];
    const found = localHabitsFallback.find(
      (h) => h.user_id === userId && h.evaluation_date === todayStr
    );

    return {
      success: true,
      completedToday: Boolean(found),
      isLocked: Boolean(found),
      serverDate: todayStr,
      record: found || null,
    };
  },

  /**
   * Guarda o actualiza la evaluación diaria de hábitos en MySQL.
   * Si el servidor detecta que ya se completó hoy, retornará error 409 y bloqueará la acción.
   */
  async saveDailyCheckIn(record: MySqlDailyHabitRecord): Promise<ApiResponse<MySqlDailyHabitRecord>> {
    try {
      const response = await fetchWithAuth(`${API_CONFIG.BASE_URL}/habits/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
      });

      const json = await response.json().catch(() => null);

      if (response.ok && json) {
        return json;
      } else {
        return {
          success: false,
          error: json?.error || 'No se pudo guardar el check-in diario.',
        };
      }
    } catch (err) {
      console.warn('[habitService] Backend no alcanzable, usando fallback en memoria:', err);
    }

    // Fallback local
    const existingIndex = localHabitsFallback.findIndex(
      (h) => h.user_id === record.user_id && h.evaluation_date === record.evaluation_date
    );

    if (existingIndex >= 0) {
      localHabitsFallback[existingIndex] = record;
    } else {
      localHabitsFallback = [...localHabitsFallback, record];
    }

    return {
      success: true,
      data: record,
    };
  },

  /**
   * Obtiene el historial de registros de hábitos para un paciente específico.
   */
  async getHabitsHistory(userId?: string): Promise<MySqlDailyHabitRecord[]> {
    if (userId) {
      try {
        const response = await fetchWithAuth(`${API_CONFIG.BASE_URL}/habits/${encodeURIComponent(userId)}`);
        if (response.ok) {
          const json = await response.json();
          if (json.success && Array.isArray(json.data)) {
            return json.data;
          }
        }
      } catch (err) {
        console.warn('[habitService] Backend no alcanzable para historial:', err);
      }
    }


    if (!userId) return [...localHabitsFallback];
    return localHabitsFallback.filter((h) => h.user_id === userId);
  },

  /**
   * Consulta si existe un check-in registrado para el usuario en una fecha específica.
   */
  async getTodayCheckIn(userId: string, dateStr: string): Promise<MySqlDailyHabitRecord | null> {
    const history = await this.getHabitsHistory(userId);
    const found = history.find((h) => h.evaluation_date === dateStr);
    return found || null;
  },
};
