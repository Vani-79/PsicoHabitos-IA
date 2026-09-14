/**
 * Servicio de gestión de pacientes y fichas clínicas.
 */

import { ApiResponse, simulateNetworkDelay } from './api';
import { MySqlPatientRecord } from '../types/patient';

// Almacén en memoria del servicio (preparado para ser reemplazado por peticiones fetch a la API backend)
let patientsStore: MySqlPatientRecord[] = [];

export const patientService = {
  /**
   * Registra una nueva ficha de paciente y la almacena en la capa de datos.
   */
  async registerPatient(record: MySqlPatientRecord): Promise<ApiResponse<MySqlPatientRecord>> {
    await simulateNetworkDelay(200);

    // Evitar duplicados exactos por email
    const existingIndex = patientsStore.findIndex(
      (p) => p.email.toLowerCase() === record.email.toLowerCase()
    );

    if (existingIndex >= 0) {
      patientsStore[existingIndex] = record;
    } else {
      patientsStore = [...patientsStore, record];
    }

    return {
      success: true,
      data: record,
    };
  },

  /**
   * Obtiene los últimos N pacientes registrados ordenados del más reciente al más antiguo.
   */
  async getRecentPatients(limit = 5): Promise<MySqlPatientRecord[]> {
    await simulateNetworkDelay(150);
    return patientsStore.slice(-limit).reverse();
  },

  /**
   * Obtiene el listado completo de pacientes registrados.
   */
  async getAllPatients(): Promise<MySqlPatientRecord[]> {
    await simulateNetworkDelay(150);
    return [...patientsStore];
  },
};
