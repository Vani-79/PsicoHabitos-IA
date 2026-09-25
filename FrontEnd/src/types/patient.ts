export type Gender = 'masculino' | 'femenino' | 'otro';

export interface PatientRegistrationForm {
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  edad: string;
  fechaNacimiento: string;     // Formato 'YYYY-MM-DD'
  genero: Gender | '';
  fechaPrimeraSesion: string;  // Formato 'YYYY-MM-DD'
  horaPrimeraSesion?: string;   // Formato 'HH:mm'
  duracionPrimeraSesion?: string; // '30' | '45' | '60' | '75' | '90'
  modalidadPrimeraSesion?: 'presencial' | 'online';
  observacionesPrimeraSesion?: string;
  email: string;
  password?: string;
  confirmPassword?: string;
}

export interface PatientLoginCredentials {
  email: string;
  password: string;
  rememberMe: boolean;
}

/**
 * Esquema normalizado para inserción en tabla de base de datos MySQL (`pacientes`).
 * Tipos de datos SQL indicados para cada campo.
 */
export interface MySqlPatientRecord {
  id?: number;                  // INT AUTO_INCREMENT PRIMARY KEY
  nombre: string;               // VARCHAR(100) NOT NULL
  apellido_paterno: string;     // VARCHAR(100) NOT NULL
  apellido_materno: string;     // VARCHAR(100) NOT NULL
  edad: number;                 // INT NOT NULL
  fecha_nacimiento: string;     // DATE NOT NULL ('YYYY-MM-DD')
  genero: Gender;               // ENUM('masculino', 'femenino', 'otro') NOT NULL
  fecha_primera_sesion: string; // DATE NOT NULL ('YYYY-MM-DD')
  hora_primera_sesion?: string;
  duracion_primera_sesion?: number;
  modalidad_primera_sesion?: 'presencial' | 'online';
  observaciones_primera_sesion?: string;
  email: string;                // VARCHAR(150) UNIQUE NOT NULL
  password_hash?: string;       // VARCHAR(255) NOT NULL
  created_at: string;           // DATETIME / TIMESTAMP ('YYYY-MM-DD HH:MM:SS')
}

export interface PatientProfileData {
  id?: number;
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string;
  edad: number;
  fecha_nacimiento: string;     // Formato 'YYYY-MM-DD'
  genero?: Gender;
  email: string;
  fecha_primera_sesion?: string;
  especialista?: string;
  availableRoles?: ('paciente' | 'psicologo')[];
  hasMultipleRoles?: boolean;
}

export interface AppointmentSession {
  id: string;
  paciente_id?: number;
  paciente_nombre?: string;
  paciente_email?: string;
  fecha: string;
  hora: string;
  horaFin?: string;
  duracion: string;
  modalidad: 'presencial' | 'online';
  estado: 'Programada' | 'Completada' | 'Cancelada';
  observaciones: string;
  motivo?: string;
  doctorNombre?: string;
}
