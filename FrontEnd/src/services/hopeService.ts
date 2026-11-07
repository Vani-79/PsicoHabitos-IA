import { API_CONFIG, fetchWithAuth } from './api';

export interface HopeMessage {
  id?: number;
  remitente: 'paciente' | 'hope';
  mensaje: string;
  enviado_en?: string;
}

export interface HopeSession {
  id: number;
  titulo_resumen: string;
  iniciada_en: string;
  finalizada_en?: string;
  animo_predominante?: string;
  resumen_clinico_psicologo?: string;
  mensajes?: HopeMessage[];
}

export interface PsychometricTestMeta {
  id: string;
  name: string;
  shortName: string;
  targetClinicalArea: string;
  totalQuestions: number;
  instructions: string;
}

export const hopeService = {
  /**
   * Consulta el estado de conectividad real del motor de H.o.p.e.
   */
  async getStatus(): Promise<{ success: boolean; online: boolean }> {
    try {
      const response = await fetchWithAuth(`${API_CONFIG.BASE_URL}/hope/status`, {
        method: 'GET',
      });
      const data = await response.json();
      return { success: true, online: Boolean(data.online) };
    } catch {
      return { success: false, online: false };
    }
  },

  /**
   * Envía un mensaje al agente H.o.p.e.
   */
  async sendMessage(message: string): Promise<{ success: boolean; reply?: string; sessionId?: number; isCrisisAlert?: boolean; isFinalized?: boolean; error?: string }> {
    try {
      const response = await fetchWithAuth(`${API_CONFIG.BASE_URL}/hope/chat`, {
        method: 'POST',
        body: JSON.stringify({ message }),
      });

      const data = await response.json();
      if (!response.ok) {
        return { success: false, error: data.error || 'Error al comunicarse con H.o.p.e.' };
      }

      return {
        success: true,
        reply: data.reply,
        sessionId: data.sessionId,
        isCrisisAlert: data.isCrisisAlert,
        isFinalized: Boolean(data.isFinalized),
      };
    } catch (error: any) {
      return { success: false, error: error.message || 'Error de conexión con el servidor.' };
    }
  },

  /**
   * Inicia uno de los 3 tests clínicos (tas-20, dass-21, scl-90-r).
   */
  async startTest(testId: 'tas-20' | 'dass-21' | 'scl-90-r'): Promise<{ success: boolean; message?: string; sessionId?: number; error?: string }> {
    try {
      const response = await fetchWithAuth(`${API_CONFIG.BASE_URL}/hope/test/start`, {
        method: 'POST',
        body: JSON.stringify({ testId }),
      });

      const data = await response.json();
      if (!response.ok) {
        return { success: false, error: data.error || 'Error al iniciar el test.' };
      }

      return {
        success: true,
        message: data.message,
        sessionId: data.sessionId,
      };
    } catch (error: any) {
      return { success: false, error: error.message || 'Error de conexión con el servidor.' };
    }
  },

  /**
   * Obtiene el historial de mensajes de la sesión del paciente.
   */
  async getHistory(): Promise<{ success: boolean; history?: HopeSession[]; error?: string }> {
    try {
      const response = await fetchWithAuth(`${API_CONFIG.BASE_URL}/hope/history`, {
        method: 'GET',
      });

      const data = await response.json();
      if (!response.ok) {
        return { success: false, error: data.error || 'Error al obtener el historial.' };
      }

      return { success: true, history: data.history };
    } catch (error: any) {
      return { success: false, error: error.message || 'Error de conexión con el servidor.' };
    }
  },

  /**
   * Obtiene el historial completo de sesiones de H.o.p.e de un paciente específico para el psicólogo.
   */
  async getPatientHistoryForPsychologist(pacienteId: number): Promise<{ success: boolean; history?: HopeSession[]; error?: string }> {
    try {
      const response = await fetchWithAuth(`${API_CONFIG.BASE_URL}/hope/history?pacienteId=${pacienteId}`, {
        method: 'GET',
      });

      const data = await response.json();
      if (!response.ok) {
        return { success: false, error: data.error || 'Error al obtener el historial de H.o.p.e.' };
      }

      return { success: true, history: data.history };
    } catch (error: any) {
      return { success: false, error: error.message || 'Error de conexión con el servidor.' };
    }
  },

  /**
   * Obtiene la lista de tests disponibles.
   */
  async getAvailableTests(): Promise<{ success: boolean; tests?: PsychometricTestMeta[]; error?: string }> {
    try {
      const response = await fetchWithAuth(`${API_CONFIG.BASE_URL}/hope/tests`, {
        method: 'GET',
      });

      const data = await response.json();
      if (!response.ok) {
        return { success: false, error: data.error || 'Error al obtener los tests.' };
      }

      return { success: true, tests: data.tests };
    } catch (error: any) {
      return { success: false, error: error.message || 'Error de conexión con el servidor.' };
    }
  },
};

