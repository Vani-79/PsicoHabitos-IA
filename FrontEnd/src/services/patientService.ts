/**
 * Servicio de gestión de pacientes y fichas clínicas conectado a la API REST MySQL.
 * Permite filtrar pacientes por el especialista autenticado.
 */

import { API_CONFIG, ApiResponse } from './api';
import { MySqlPatientRecord, PatientProfileData } from '../types/patient';

let localMemoryFallback: MySqlPatientRecord[] = [];

export const patientService = {
  /**
   * Registra un paciente en la base de datos MySQL vía backend REST.
   * Vincula la ficha clínica con el especialista autenticado.
   */
  async registerPatient(
    record: MySqlPatientRecord,
    doctorEmail?: string
  ): Promise<ApiResponse<MySqlPatientRecord>> {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/patients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...record, doctorEmail }),
      });

      const json = await response.json().catch(() => null);

      if (response.ok && json && json.success) {
        return json;
      }

      return {
        success: false,
        error: json?.error || 'Error al registrar el paciente en el servidor.',
      };
    } catch (err) {
      console.warn('[patientService] Backend no alcanzable:', err);
      return {
        success: false,
        error: 'No se pudo conectar con el servidor para registrar al paciente.',
      };
    }
  },

  /**
   * Obtiene los últimos N pacientes registrados desde MySQL vía backend REST.
   * Si se especifica doctorEmail, retorna solo los pacientes de ese especialista.
   */
  async getRecentPatients(limit = 5, doctorEmail?: string): Promise<MySqlPatientRecord[]> {
    try {
      const queryParams = new URLSearchParams({ limit: String(limit) });
      if (doctorEmail) {
        queryParams.append('doctorEmail', doctorEmail);
      }

      const response = await fetch(`${API_CONFIG.BASE_URL}/patients/recent?${queryParams.toString()}`);
      if (response.ok) {
        const json = await response.json();
        if (json.success && Array.isArray(json.data)) {
          return json.data;
        }
      }
    } catch (err) {
      console.warn('[patientService] Backend no alcanzable para consulta reciente, usando fallback:', err);
    }
    return localMemoryFallback.slice(-limit).reverse();
  },

  /**
   * Obtiene el listado completo de pacientes registrados.
   * Si se especifica doctorEmail, filtra por ese especialista.
   */
  async getAllPatients(doctorEmail?: string): Promise<MySqlPatientRecord[]> {
    try {
      const queryParams = doctorEmail ? `?doctorEmail=${encodeURIComponent(doctorEmail)}` : '';
      const response = await fetch(`${API_CONFIG.BASE_URL}/patients${queryParams}`);
      if (response.ok) {
        const json = await response.json();
        if (json.success && Array.isArray(json.data)) {
          return json.data;
        }
      }
    } catch (err) {
      console.warn('[patientService] Backend no alcanzable para listado completo:', err);
    }
    return [...localMemoryFallback];
  },

  /**
   * Obtiene la información de perfil detallada del paciente actual,
   * incluyendo su especialista asignado desde MySQL.
   */
  async getPatientProfile(email?: string, name?: string): Promise<PatientProfileData | null> {
    try {
      const queryParams = new URLSearchParams();
      if (email) queryParams.append('email', email);
      if (name) queryParams.append('name', name);

      const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
      const response = await fetch(`${API_CONFIG.BASE_URL}/patients/profile${queryString}`);
      if (response.ok) {
        const json = await response.json();
        if (json.success && json.data) {
          return json.data;
        }
      }
    } catch (err) {
      console.warn('[patientService] Error al consultar perfil del paciente:', err);
    }
    return null;
  },
};
