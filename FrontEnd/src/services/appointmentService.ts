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

export interface UpdateAppointmentPayload {
  fecha: string; // 'YYYY-MM-DD'
  hora: string;  // 'HH:mm'
  duracion?: number;
  modalidad: 'presencial' | 'online';
  observaciones?: string;
}

interface RawCalendarItem {
  id: string | number;
  paciente_id?: number;
  paciente_nombre?: string;
  paciente_email?: string;
  fecha: string;
  hora?: string;
  hora_inicio?: string;
  hora_fin?: string;
  duracion?: string | number;
  modalidad: 'presencial' | 'online';
  estado: string;
  observaciones: string;
  rol_psicologo?: 'titular' | 'suplente';
}

const normalizeAppointmentStatus = (
  estado?: string
): AppointmentSession['estado'] => {
  if (estado === 'completada') {
    return 'Completada';
  }
  if (estado === 'cancelada' || estado === 'Cancelada') {
    return 'Cancelada';
  }
  return 'Programada';
};

export const appointmentService = {
  /**
   * Modifica una sesión programada existente.
   */
  async updateAppointment(
    id: string | number,
    payload: UpdateAppointmentPayload
  ): Promise<ApiResponse<AppointmentSession | { id: number | string }>> {
    try {
      const response = await fetchWithAuth(`${API_CONFIG.BASE_URL}/appointments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await response.json().catch(() => null);

      if (response.ok && json?.success) {
        return json;
      }

      return {
        success: false,
        error: json?.error || 'Error al actualizar la sesión en el servidor.',
      };
    } catch (err) {
      console.warn('[appointmentService] Error de conexión al actualizar cita:', err);
      return {
        success: false,
        error: 'No se pudo conectar con el servidor para actualizar la sesión.',
      };
    }
  },

  /**
   * Cancela y elimina una sesión programada existente.
   */
  async deleteAppointment(id: string | number): Promise<ApiResponse<{ message?: string }>> {
    try {
      const response = await fetchWithAuth(`${API_CONFIG.BASE_URL}/appointments/${id}`, {
        method: 'DELETE',
      });

      const json = await response.json().catch(() => null);

      if (response.ok && json?.success) {
        return json;
      }

      return {
        success: false,
        error: json?.error || 'Error al cancelar la sesión en el servidor.',
      };
    } catch (err) {
      console.warn('[appointmentService] Error de conexión al cancelar cita:', err);
      return {
        success: false,
        error: 'No se pudo conectar con el servidor para cancelar la sesión.',
      };
    }
  },
  /**
   * Crea una nueva sesión clínica agendada por el especialista.
   */
  async createAppointment(
    payload: CreateAppointmentPayload
  ): Promise<ApiResponse<AppointmentSession | { id: number }>> {
    try {
      const response = await fetchWithAuth(`${API_CONFIG.BASE_URL}/appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await response.json().catch(() => null);

      if (response.ok && json?.success) {
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
          return json.data.map((item: RawCalendarItem) => ({
            id: String(item.id),
            paciente_id: item.paciente_id,
            paciente_nombre: item.paciente_nombre,
            paciente_email: item.paciente_email,
            fecha: item.fecha,
            hora: item.hora_inicio || item.hora,
            horaFin: item.hora_fin,
            duracion: String(item.duracion || 60),
            modalidad: item.modalidad,
            estado: normalizeAppointmentStatus(item.estado),
            observaciones: item.observaciones,
            rol_psicologo: item.rol_psicologo || 'titular',
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
          const normalizeSession = (s: AppointmentSession): AppointmentSession => ({
            ...s,
            modalidad: String(s.modalidad || '').toLowerCase() === 'online' ? 'online' : 'presencial',
          });

          return {
            proximas: (json.data.proximas || []).map(normalizeSession),
            historial: (json.data.historial || []).map(normalizeSession),
          };
        }
      }
    } catch (err) {
      console.warn('[appointmentService] Error al obtener citas del paciente:', err);
    }
    return { proximas: [], historial: [] };
  },
};
