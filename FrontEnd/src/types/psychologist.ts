export interface PsychologistLoginCredentials {
  email: string;
  password: string;
  rememberMe: boolean;
}

/**
 * Esquema normalizado para inserción en tabla de base de datos MySQL (`psicologos`).
 * Tipos de datos SQL indicados para cada campo.
 */
export interface MySqlPsychologistRecord {
  id?: number;              // INT AUTO_INCREMENT PRIMARY KEY
  nombre: string;           // VARCHAR(100) NOT NULL
  apellido_paterno: string; // VARCHAR(100) NOT NULL
  apellido_materno: string; // VARCHAR(100) NOT NULL
  telefono: string;         // VARCHAR(20) NOT NULL
  email: string;            // VARCHAR(150) UNIQUE NOT NULL
  password_hash?: string;   // VARCHAR(255) NOT NULL
  created_at: string;       // DATETIME / TIMESTAMP ('YYYY-MM-DD HH:MM:SS')
}
