/**
 * Servicio de gestión de citas y sesiones clínicas conectado al backend REST (/api/appointments).
 */

import { API_CONFIG, ApiResponse, fetchWithAuth } from './api';
import { AppointmentSession } from '../types/patient';

export interface CreateAppointmentPayload {
  paciente_id: number;
  fecha: string; // 'YYYY-MM-DD'
  hora: string;  // 'HH:mm'
  duracion: number; // 30, 45, 60, 75, 90
  modalidad: 'presencial' | 'online';
  observaciones: string;
}

export const appointmentService = {
  /**
   * Crea una nueva sesión clínica agendada por el especialista.
   */
  async createAppointment(
    payload: CreateAppointmentPayload
  ): Promise<ApiResponse<any>> {
    try {
      const response = await fetchWithAuth(`${API_CONFIG.BASE_URL}/appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await response.json().catch(() => null);

      if (response.ok && json && json.success) {
        return json;
      }

      return {
        success: false,
        error: json?.error || 'Error al agendar la sesión en el servidor.',
      };
    } catch (err) {
      console.warn('[appointmentService] Error de conexión al crear cita:', err);
      return {
        success: false,
        error: 'No se pudo conectar con el servidor para agendar la sesión.',
      };
    }
  },

  /**
   * Obtiene el historial de sesiones de un paciente específico para el especialista.
   */
  async getPatientAppointments(patientId: number): Promise<AppointmentSession[]> {
    try {
      const response = await fetchWithAuth(
        `${API_CONFIG.BASE_URL}/appointments/patient/${patientId}`
      );
      if (response.ok) {
        const json = await response.json();
        if (json.success && Array.isArray(json.data)) {
          return json.data;
        }
      }
    } catch (err) {
      console.warn('[appointmentService] Error al obtener sesiones del paciente:', err);
    }
    return [];
  },

  /**
   * Obtiene las citas del especialista para la vista de calendario (con filtro opcional).
   */
  async getPsychologistCalendar(params?: {
    month?: string;
    date?: string;
  }): Promise<AppointmentSession[]> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.month) queryParams.append('month', params.month);
      if (params?.date) queryParams.append('date', params.date);

      const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
      const response = await fetchWithAuth(
        `${API_CONFIG.BASE_URL}/appointments/psychologist/calendar${queryString}`
      );

      if (response.ok) {
        const json = await response.json();
        if (json.success && Array.isArray(json.data)) {
          return json.data.map((item: any) => ({
            id: String(item.id),
            paciente_id: item.paciente_id,
            paciente_nombre: item.paciente_nombre,
            paciente_email: item.paciente_email,
            fecha: item.fecha,
            hora: item.hora_inicio || item.hora,
            horaFin: item.hora_fin,
            duracion: String(item.duracion || 60),
            modalidad: item.modalidad,
            estado: item.estado === 'completada' ? 'Completada' : 'Programada',
            observaciones: item.observaciones,
          }));
        }
      }
    } catch (err) {
      console.warn('[appointmentService] Error al obtener calendario:', err);
    }
    return [];
  },

  /**
   * Obtiene las citas del paciente autenticado divididas en próximas e historial.
   */
  async getMySessions(): Promise<{
    proximas: AppointmentSession[];
    historial: AppointmentSession[];
  }> {
    try {
      const response = await fetchWithAuth(`${API_CONFIG.BASE_URL}/appointments/my-sessions`);
      if (response.ok) {
        const json = await response.json();
        if (json.success && json.data) {
          return {
            proximas: json.data.proximas || [],
            historial: json.data.historial || [],
          };
        }
      }
    } catch (err) {
      console.warn('[appointmentService] Error al obtener citas del paciente:', err);
    }
    return { proximas: [], historial: [] };
  },
};
