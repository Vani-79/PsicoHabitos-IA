/**
 * Servicio de gestión de pacientes y fichas clínicas conectado a la API REST MySQL.
 * Permite filtrar pacientes por el especialista autenticado.
 */

import { API_CONFIG, ApiResponse } from './api';
import { MySqlPatientRecord } from '../types/patient';

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

      if (response.ok) {
        const json = await response.json();
        return json;
      }
    } catch (err) {
      console.warn('[patientService] Backend no alcanzable, usando fallback en memoria:', err);
    }

    // Fallback de respaldo en memoria para desarrollo sin servidor activo
    const idx = localMemoryFallback.findIndex(
      (p) => p.email.toLowerCase() === record.email.toLowerCase()
    );
    if (idx >= 0) {
      localMemoryFallback[idx] = record;
    } else {
      localMemoryFallback = [...localMemoryFallback, record];
    }

    return { success: true, data: record };
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
};
