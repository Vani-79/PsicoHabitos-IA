-- ==============================================================================
-- BASE DE DATOS: PsicoHábitos
-- Motor: MySQL 8.0
-- Codificación: UTF-8 (utf8mb4_unicode_ci)
-- Descripción: Esquema relacional completo para gestión de pacientes, especialistas,
--              hábitos diarios, citas, recursos terapéuticos y charlas con Hope.
-- ==============================================================================

CREATE DATABASE IF NOT EXISTS psicohabitos_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE psicohabitos_db;

-- ------------------------------------------------------------------------------
-- 1. TABLA: usuarios (Credenciales y control de acceso unificado)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(120) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NULL,
  rol ENUM('psicologo', 'paciente', 'admin') NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  debe_crear_password BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_usuarios_email (email),
  INDEX idx_usuarios_rol (rol)
) ENGINE=InnoDB;

-- ------------------------------------------------------------------------------
-- 2. TABLA: psicologos (Perfil del especialista)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS psicologos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL UNIQUE,
  nombre VARCHAR(60) NOT NULL,
  apellidos VARCHAR(80) NOT NULL,
  especialidad VARCHAR(100) NOT NULL DEFAULT 'Psicología Clínica',
  telefono VARCHAR(25) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_psicologos_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------------------------
-- 3. TABLA: pacientes (Ficha clínica y datos del paciente)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pacientes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NULL UNIQUE,
  nombre VARCHAR(50) NOT NULL,
  apellido_paterno VARCHAR(50) NOT NULL,
  apellido_materno VARCHAR(50) NOT NULL,
  edad INT NOT NULL,
  fecha_nacimiento DATE NOT NULL,
  genero ENUM('masculino', 'femenino', 'otro') NOT NULL,
  email VARCHAR(120) NOT NULL UNIQUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_pacientes_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  INDEX idx_pacientes_email (email),
  INDEX idx_pacientes_nombre (apellido_paterno, nombre)
) ENGINE=InnoDB;

-- ------------------------------------------------------------------------------
-- 4. TABLA: relacion_psicologo_paciente (Asignación y seguimiento clínico)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS relacion_psicologo_paciente (
  id INT AUTO_INCREMENT PRIMARY KEY,
  psicologo_id INT NOT NULL,
  paciente_id INT NOT NULL,
  fecha_primera_sesion DATE NOT NULL,
  estado ENUM('activo', 'inactivo', 'alta_terapeutica') NOT NULL DEFAULT 'activo',
  notas_clinicas TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_relacion_psicologo
    FOREIGN KEY (psicologo_id) REFERENCES psicologos(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_relacion_paciente
    FOREIGN KEY (paciente_id) REFERENCES pacientes(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  UNIQUE KEY uk_psicologo_paciente (psicologo_id, paciente_id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------------------------
-- 5. TABLA: citas_sesiones (Agenda de citas pasadas y programadas)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS citas_sesiones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  psicologo_id INT NOT NULL,
  paciente_id INT NOT NULL,
  fecha_hora_inicio DATETIME NOT NULL,
  fecha_hora_fin DATETIME NOT NULL,
  modalidad ENUM('presencial', 'online') NOT NULL DEFAULT 'presencial',
  estado ENUM('programada', 'completada', 'cancelada', 'no_asistio') NOT NULL DEFAULT 'programada',
  observaciones TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_citas_psicologo
    FOREIGN KEY (psicologo_id) REFERENCES psicologos(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_citas_paciente
    FOREIGN KEY (paciente_id) REFERENCES pacientes(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  INDEX idx_citas_paciente_fecha (paciente_id, fecha_hora_inicio),
  INDEX idx_citas_psicologo_fecha (psicologo_id, fecha_hora_inicio)
) ENGINE=InnoDB;

-- ------------------------------------------------------------------------------
-- 6. TABLA: habitos_diarios (Check-in diario de 6 hábitos, agua y descanso)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS habitos_diarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  paciente_id INT NOT NULL,
  evaluation_date DATE NOT NULL,
  comida TINYINT NOT NULL CHECK (comida BETWEEN 1 AND 5),
  ejercicio TINYINT NOT NULL CHECK (ejercicio BETWEEN 1 AND 5),
  hidratacion DECIMAL(3,1) NOT NULL DEFAULT 2.0,
  ansiedad TINYINT NOT NULL CHECK (ansiedad BETWEEN 1 AND 5),
  sueno TINYINT NOT NULL CHECK (sueno BETWEEN 1 AND 5),
  sueno_horas DECIMAL(3,1) NULL DEFAULT 8.0,
  estres TINYINT NOT NULL CHECK (estres BETWEEN 1 AND 5),
  confirmed_at DATETIME NOT NULL,
  CONSTRAINT fk_habitos_paciente
    FOREIGN KEY (paciente_id) REFERENCES pacientes(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  UNIQUE KEY uk_paciente_evaluation_date (paciente_id, evaluation_date)
) ENGINE=InnoDB;

-- ------------------------------------------------------------------------------
-- 7. TABLA: sesiones_hope (Conversaciones del paciente con el agente Hope)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sesiones_hope (
  id INT AUTO_INCREMENT PRIMARY KEY,
  paciente_id INT NOT NULL,
  titulo_resumen VARCHAR(120) NOT NULL DEFAULT 'Sesión de acompañamiento',
  iniciada_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finalizada_en DATETIME NULL,
  animo_predominante VARCHAR(50) NULL,
  resumen_clinico_psicologo TEXT NULL,
  CONSTRAINT fk_sesiones_hope_paciente
    FOREIGN KEY (paciente_id) REFERENCES pacientes(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  INDEX idx_sesiones_hope_paciente (paciente_id, iniciada_en DESC)
) ENGINE=InnoDB;

-- ------------------------------------------------------------------------------
-- 8. TABLA: mensajes_hope (Historial cronológico de mensajes con Hope)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mensajes_hope (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sesion_hope_id INT NOT NULL,
  remitente ENUM('paciente', 'hope') NOT NULL,
  mensaje TEXT NOT NULL,
  enviado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_mensajes_hope_sesion
    FOREIGN KEY (sesion_hope_id) REFERENCES sesiones_hope(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  INDEX idx_mensajes_sesion_tiempo (sesion_hope_id, enviado_en ASC)
) ENGINE=InnoDB;

-- ------------------------------------------------------------------------------
-- 9. TABLA: recursos_ejercicios (Tareas terapéuticas asignadas por especialista)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS recursos_ejercicios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  psicologo_id INT NOT NULL,
  paciente_id INT NOT NULL,
  titulo VARCHAR(120) NOT NULL,
  instrucciones TEXT NOT NULL,
  categoria ENUM('respiracion', 'relajacion', 'tarea_cognitiva', 'otro') NOT NULL DEFAULT 'respiracion',
  estado ENUM('asignado', 'en_progreso', 'completado') NOT NULL DEFAULT 'asignado',
  fecha_asignacion DATE NOT NULL,
  fecha_limite DATE NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_recursos_psicologo
    FOREIGN KEY (psicologo_id) REFERENCES psicologos(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_recursos_paciente
    FOREIGN KEY (paciente_id) REFERENCES pacientes(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  INDEX idx_recursos_paciente_estado (paciente_id, estado)
) ENGINE=InnoDB;

-- ------------------------------------------------------------------------------
-- 10. TABLA: consentimientos_legales (Auditoría de cumplimiento Ley 21.719)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS consentimientos_legales (
  id INT AUTO_INCREMENT PRIMARY KEY,
  paciente_id INT NOT NULL,
  tipo_ley VARCHAR(80) NOT NULL DEFAULT 'Ley 21.719 Salud Mental y Datos Sensibles',
  texto_version TEXT NOT NULL,
  aceptado BOOLEAN NOT NULL DEFAULT TRUE,
  ip_origen VARCHAR(45) NULL,
  fecha_aceptacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_consentimientos_paciente
    FOREIGN KEY (paciente_id) REFERENCES pacientes(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  INDEX idx_consentimientos_paciente (paciente_id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------------------------
-- DATOS SEMILLA DE PRUEBA (Para validar el funcionamiento del sistema)
-- ------------------------------------------------------------------------------

-- Usuarios de prueba iniciales (Contraseña de prueba: Psico123@)
INSERT INTO usuarios (id, email, password_hash, rol, activo, debe_crear_password) VALUES
  (1, 'roberto@gmail.com', '$2a$10$tZc1q.7w4s6oR8V4hK4uJeL7kG3A6w.bHhP4X0XzC8VwK1Jc/hY6q', 'psicologo', 1, 0),
  (2, 'carlos@gmail.com', '$2a$10$tZc1q.7w4s6oR8V4hK4uJeL7kG3A6w.bHhP4X0XzC8VwK1Jc/hY6q', 'paciente', 1, 0)
ON DUPLICATE KEY UPDATE email=VALUES(email), password_hash=VALUES(password_hash);

-- Perfil psicólogo (Dr. Roberto Gonzales)
INSERT INTO psicologos (id, usuario_id, nombre, apellidos, especialidad, telefono) VALUES
  (1, 1, 'Roberto', 'Gonzales', 'Psicología Clínica y Cognitivo Conductual', '+56 9 8765 4321')
ON DUPLICATE KEY UPDATE nombre=VALUES(nombre);

-- Perfil paciente (Carlos Lopez Gomez)
INSERT INTO pacientes (id, usuario_id, nombre, apellido_paterno, apellido_materno, edad, fecha_nacimiento, genero, email) VALUES
  (1, 2, 'Carlos', 'Lopez', 'Gomez', 21, '2005-04-01', 'masculino', 'carlos@gmail.com')
ON DUPLICATE KEY UPDATE nombre=VALUES(nombre);

-- Vínculo Dr. Roberto con Carlos
INSERT INTO relacion_psicologo_paciente (id, psicologo_id, paciente_id, fecha_primera_sesion, estado, notas_clinicas) VALUES
  (1, 1, 1, '2026-09-11', 'activo', 'Paciente inicial registrado para atención psicológica.')
ON DUPLICATE KEY UPDATE estado=VALUES(estado);

-- Check-in de hábitos de muestra
INSERT INTO habitos_diarios (paciente_id, evaluation_date, comida, ejercicio, hidratacion, ansiedad, sueno, sueno_horas, estres, confirmed_at) VALUES
  (1, '2026-09-13', 4, 3, 2.5, 2, 4, 7.5, 2, '2026-09-13 21:00:00')
ON DUPLICATE KEY UPDATE evaluation_date=VALUES(evaluation_date);

-- Sesión y mensajes de muestra con Hope
INSERT INTO sesiones_hope (id, paciente_id, titulo_resumen, iniciada_en, animo_predominante, resumen_clinico_psicologo) VALUES
  (1, 1, 'Reflexión nocturna sobre carga laboral', '2026-09-13 20:30:00', 'Preocupado pero receptivo', 'Paciente dialogó con Hope sobre estrategias de desconexión nocturna antes de dormir.')
ON DUPLICATE KEY UPDATE titulo_resumen=VALUES(titulo_resumen);

INSERT INTO mensajes_hope (sesion_hope_id, remitente, mensaje, enviado_en) VALUES
  (1, 'hope', '¡Hola, Carlos! ¿Cómo te has sentido con tus niveles de descanso hoy?', '2026-09-13 20:30:15'),
  (1, 'paciente', 'He estado un poco tenso por el trabajo, me cuesta desconectarme al final del día.', '2026-09-13 20:31:00'),
  (1, 'hope', 'Es comprensible. Recuerda la respiración consciente guiada que te recomendó la Dra. María. ¿Te gustaría practicarla ahora?', '2026-09-13 20:31:40')
ON DUPLICATE KEY UPDATE remitente=VALUES(remitente);

-- Consentimiento legal Ley 21.719
INSERT INTO consentimientos_legales (paciente_id, tipo_ley, texto_version, aceptado, ip_origen) VALUES
  (1, 'Ley 21.719 Salud Mental y Datos Sensibles', 'Consentimiento informado aceptado digitalmente en el proceso de registro.', 1, '127.0.0.1')
ON DUPLICATE KEY UPDATE aceptado=VALUES(aceptado);
