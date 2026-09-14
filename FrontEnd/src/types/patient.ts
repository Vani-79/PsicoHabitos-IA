export type Gender = 'masculino' | 'femenino' | 'otro';

export interface PatientRegistrationForm {
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  edad: string;
  fechaNacimiento: string;     // Formato 'YYYY-MM-DD'
  genero: Gender | '';
  fechaPrimeraSesion: string;  // Formato 'YYYY-MM-DD'
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
  email: string;                // VARCHAR(150) UNIQUE NOT NULL
  password_hash?: string;       // VARCHAR(255) NOT NULL
  created_at: string;           // DATETIME / TIMESTAMP ('YYYY-MM-DD HH:MM:SS')
}
