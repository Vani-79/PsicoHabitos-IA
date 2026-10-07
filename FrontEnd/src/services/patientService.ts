/**
 * Servicio de gestión de pacientes y fichas clínicas conectado a la API REST MySQL.
 * Permite filtrar pacientes por el especialista autenticado.
 */

import { API_CONFIG, ApiResponse, fetchWithAuth } from './api';
import {
  MySqlPatientRecord,
  PatientProfileData,
  PatientLookupResult,
  LinkExistingPatientPayload,
} from '../types/patient';

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
      const response = await fetchWithAuth(`${API_CONFIG.BASE_URL}/patients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...record, doctorEmail }),
      });

      const json = await response.json().catch(() => null);

      if (response.ok && json?.success) {
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
   * Retorna los pacientes asignados al especialista autenticado.
   */
  async getRecentPatients(limit = 5, doctorEmail?: string): Promise<MySqlPatientRecord[]> {
    try {
      const queryParams = new URLSearchParams({ limit: String(limit) });
      if (doctorEmail) {
        queryParams.append('doctorEmail', doctorEmail);
      }

      const response = await fetchWithAuth(`${API_CONFIG.BASE_URL}/patients/recent?${queryParams.toString()}`);
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
   * Obtiene los pacientes que tienen consulta o cita programada para el día de hoy.
   */
  async getTodayPatients(doctorEmail?: string): Promise<MySqlPatientRecord[]> {
    try {
      const queryParams = doctorEmail ? `?doctorEmail=${encodeURIComponent(doctorEmail)}` : '';
      const response = await fetchWithAuth(`${API_CONFIG.BASE_URL}/patients/today${queryParams}`);
      if (response.ok) {
        const json = await response.json();
        if (json.success && Array.isArray(json.data)) {
          return json.data;
        }
      }
    } catch (err) {
      console.warn('[patientService] Backend no alcanzable para pacientes de hoy:', err);
    }

    const todayStr = new Date().toISOString().split('T')[0];
    return localMemoryFallback.filter(
      (p) => p.fecha_primera_sesion === todayStr
    );
  },

  /**
   * Obtiene el listado completo de pacientes registrados del especialista autenticado.
   */
  async getAllPatients(doctorEmail?: string): Promise<MySqlPatientRecord[]> {
    try {
      const queryParams = doctorEmail ? `?doctorEmail=${encodeURIComponent(doctorEmail)}` : '';
      const response = await fetchWithAuth(`${API_CONFIG.BASE_URL}/patients${queryParams}`);
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
      const response = await fetchWithAuth(`${API_CONFIG.BASE_URL}/patients/profile${queryString}`);

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

  /**
   * Busca si un paciente ya está registrado en PsicoHábitos por su correo.
   */
  async lookupPatient(email: string): Promise<PatientLookupResult> {
    try {
      const response = await fetchWithAuth(`${API_CONFIG.BASE_URL}/patients/lookup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const json = await response.json().catch(() => null);
      if (response.ok && json) {
        return json;
      }
      return {
        success: false,
        exists: false,
        message: json?.error || 'Error al buscar el paciente.',
      };
    } catch (err) {
      console.warn('[patientService] Error en lookup:', err);
      return {
        success: false,
        exists: false,
        message: 'No se pudo conectar con el servidor para buscar al paciente.',
      };
    }
  },

  /**
   * Solicita el envío del código OTP de 6 dígitos al correo del paciente para autorizar traspaso o suplencia.
   */
  async sendTitularOtp(payload: {
    paciente_id: number;
    tipo_relacion: 'titular' | 'suplente';
    fecha_fin_suplencia?: string | null;
  }): Promise<ApiResponse<{ patientEmail: string }>> {
    try {
      const response = await fetchWithAuth(`${API_CONFIG.BASE_URL}/patients/send-titular-otp`, {
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
        error: json?.error || 'Error al enviar código de autorización.',
      };
    } catch (err) {
      console.warn('[patientService] Error enviando OTP:', err);
      return {
        success: false,
        error: 'No se pudo conectar con el servidor para enviar el código.',
      };
    }
  },

  /**
   * Valida el código OTP y vincula al paciente existente bajo la modalidad indicada.
   */
  async linkExistingPatient(payload: LinkExistingPatientPayload): Promise<ApiResponse<MySqlPatientRecord>> {
    try {
      const response = await fetchWithAuth(`${API_CONFIG.BASE_URL}/patients/link-existing`, {
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
        error: json?.error || 'Error al vincular paciente existente.',
      };
    } catch (err) {
      console.warn('[patientService] Error al vincular paciente existente:', err);
      return {
        success: false,
        error: 'No se pudo conectar con el servidor para completar la vinculación.',
      };
    }
  },

  /**
   * Finaliza de forma anticipada la suplencia activa de un paciente.
   */
  async endSubstitution(paciente_id: number): Promise<ApiResponse<void>> {
    try {
      const response = await fetchWithAuth(`${API_CONFIG.BASE_URL}/patients/end-substitution`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paciente_id }),
      });

      const json = await response.json().catch(() => null);
      if (response.ok && json?.success) {
        return json;
      }
      return {
        success: false,
        error: json?.error || 'Error al finalizar la suplencia.',
      };
    } catch (err) {
      console.warn('[patientService] Error al finalizar suplencia:', err);
      return {
        success: false,
        error: 'No se pudo conectar con el servidor para finalizar la suplencia.',
      };
    }
  },
};
