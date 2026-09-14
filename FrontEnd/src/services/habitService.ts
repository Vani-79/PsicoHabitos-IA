/**
 * Servicio de seguimiento y registro de hábitos diarios del paciente.
 */

import { ApiResponse, simulateNetworkDelay } from './api';
import { MySqlDailyHabitRecord } from '../types/habits';

// Almacén en memoria del servicio para historial de hábitos
let habitsStore: MySqlDailyHabitRecord[] = [];

export const habitService = {
  /**
   * Guarda o actualiza la evaluación diaria de hábitos de un paciente.
   */
  async saveDailyCheckIn(record: MySqlDailyHabitRecord): Promise<ApiResponse<MySqlDailyHabitRecord>> {
    await simulateNetworkDelay(200);

    const existingIndex = habitsStore.findIndex(
      (h) => h.user_id === record.user_id && h.evaluation_date === record.evaluation_date
    );

    if (existingIndex >= 0) {
      habitsStore[existingIndex] = record;
    } else {
      habitsStore = [...habitsStore, record];
    }

    console.log('[habitService] Check-in diario procesado exitosamente:', record);

    return {
      success: true,
      data: record,
    };
  },

  /**
   * Obtiene el historial de registros de hábitos para un paciente específico.
   */
  async getHabitsHistory(userId?: string): Promise<MySqlDailyHabitRecord[]> {
    await simulateNetworkDelay(150);
    if (!userId) return [...habitsStore];
    return habitsStore.filter((h) => h.user_id === userId);
  },

  /**
   * Consulta si existe un check-in registrado para el usuario en una fecha específica.
   */
  async getTodayCheckIn(userId: string, dateStr: string): Promise<MySqlDailyHabitRecord | null> {
    await simulateNetworkDelay(100);
    const found = habitsStore.find(
      (h) => h.user_id === userId && h.evaluation_date === dateStr
    );
    return found || null;
  },
};
