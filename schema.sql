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

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;
SET time_zone = '-03:00';

-- ------------------------------------------------------------------------------
-- 1. TABLA: usuarios (Credenciales y control de acceso unificado)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(120) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NULL,
  rol ENUM('psicologo', 'paciente', 'ambos', 'admin') NOT NULL DEFAULT 'paciente',
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
  email VARCHAR(120) NOT NULL UNIQUE,
  suscripcion_meses INT NOT NULL DEFAULT 1,
  suscripcion_inicio DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  suscripcion_fin DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  suscripcion_activa BOOLEAN NOT NULL DEFAULT TRUE,
  suscripcion_notas TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_psicologos_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  INDEX idx_psicologos_email (email),
  INDEX idx_psicologos_suscripcion (suscripcion_activa, suscripcion_fin)
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
-- 9. TABLA: recursos_paciente (Catálogo universal de videos y técnicas de apoyo)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS recursos_paciente (
  id INT AUTO_INCREMENT PRIMARY KEY,
  seccion VARCHAR(50) NOT NULL, -- Ej: 'ansiedad', 'estres', 'sueno', etc.
  tipo_tecnica VARCHAR(80) NOT NULL, -- Ej: 'Respiración diafragmática', 'Grounding', etc.
  titulo VARCHAR(150) NOT NULL,
  descripcion TEXT NOT NULL,
  video_url VARCHAR(255) NOT NULL,
  miniatura_url VARCHAR(255) NULL,
  duracion_segundos INT NULL,
  orden INT NOT NULL DEFAULT 1,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_recursos_seccion_activo (seccion, activo)
) ENGINE=InnoDB;

-- ------------------------------------------------------------------------------
-- 10. TABLA: consentimientos_legales (Auditoría de cumplimiento Ley 21.719)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS consentimientos_legales (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  tipo_ley VARCHAR(80) NOT NULL DEFAULT 'Ley 21.719 Salud Mental y Datos Sensibles',
  texto_version TEXT NOT NULL,
  aceptado BOOLEAN NOT NULL DEFAULT TRUE,
  ip_origen VARCHAR(45) NULL,
  fecha_aceptacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_consentimientos_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  INDEX idx_consentimientos_usuario (usuario_id)
) ENGINE=InnoDB;
-- ------------------------------------------------------------------------------
-- 11. TABLA: codigos_recuperacion (Verificación de correo para recuperación de contraseña)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS codigos_recuperacion (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(120) NOT NULL,
  codigo VARCHAR(6) NOT NULL,
  expira_en DATETIME NOT NULL,
  usado BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_codigos_email_codigo (email, codigo, usado)
) ENGINE=InnoDB;

-- ------------------------------------------------------------------------------
-- 12. TRIGGERS UNIFICADOS (Suscripción y Ética Clínica)
-- ------------------------------------------------------------------------------
DELIMITER $$

-- Trigger unificado para relación psicólogo-paciente (creación de nuevos pacientes)
DROP TRIGGER IF EXISTS trg_relacion_psicologo_paciente_unificado$$
CREATE TRIGGER trg_relacion_psicologo_paciente_unificado
BEFORE INSERT ON relacion_psicologo_paciente
FOR EACH ROW
BEGIN
  DECLARE v_activa BOOLEAN;
  DECLARE v_fin DATETIME;
  DECLARE v_psico_usuario INT;
  DECLARE v_pac_usuario INT;

  -- 1. Control unificado de suscripción activa
  SELECT suscripcion_activa, suscripcion_fin 
  INTO v_activa, v_fin 
  FROM psicologos 
  WHERE id = NEW.psicologo_id;

  IF v_activa IS NOT TRUE OR v_fin < NOW() THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Suscripción Finalizada comuníquese con el administrador para renovarla';
  END IF;

  -- 2. Control de ética clínica (Anti-autoatención)
  SELECT usuario_id INTO v_psico_usuario FROM psicologos WHERE id = NEW.psicologo_id;
  SELECT usuario_id INTO v_pac_usuario FROM pacientes WHERE id = NEW.paciente_id;

  IF v_psico_usuario IS NOT NULL AND v_pac_usuario IS NOT NULL AND v_psico_usuario = v_pac_usuario THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Violación de ética clínica: Un psicólogo no puede ser asignado como paciente de sí mismo.';
  END IF;
END$$

DROP TRIGGER IF EXISTS trg_no_autoatencion_relacion_update$$
CREATE TRIGGER trg_no_autoatencion_relacion_update
BEFORE UPDATE ON relacion_psicologo_paciente
FOR EACH ROW
BEGIN
  DECLARE v_psico_usuario INT;
  DECLARE v_pac_usuario INT;

  SELECT usuario_id INTO v_psico_usuario FROM psicologos WHERE id = NEW.psicologo_id;
  SELECT usuario_id INTO v_pac_usuario FROM pacientes WHERE id = NEW.paciente_id;

  IF v_psico_usuario IS NOT NULL AND v_pac_usuario IS NOT NULL AND v_psico_usuario = v_pac_usuario THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Violación de ética clínica: Un psicólogo no puede ser asignado como paciente de sí mismo.';
  END IF;
END$$

-- Trigger unificado para citas y sesiones clínicas
DROP TRIGGER IF EXISTS trg_citas_sesiones_unificado$$
CREATE TRIGGER trg_citas_sesiones_unificado
BEFORE INSERT ON citas_sesiones
FOR EACH ROW
BEGIN
  DECLARE v_activa BOOLEAN;
  DECLARE v_fin DATETIME;
  DECLARE v_psico_usuario INT;
  DECLARE v_pac_usuario INT;

  -- 1. Control unificado de suscripción activa
  SELECT suscripcion_activa, suscripcion_fin 
  INTO v_activa, v_fin 
  FROM psicologos 
  WHERE id = NEW.psicologo_id;

  IF v_activa IS NOT TRUE OR v_fin < NOW() THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Suscripción Finalizada comuníquese con el administrador para renovarla';
  END IF;

  -- 2. Control de ética clínica (Anti-autoatención)
  SELECT usuario_id INTO v_psico_usuario FROM psicologos WHERE id = NEW.psicologo_id;
  SELECT usuario_id INTO v_pac_usuario FROM pacientes WHERE id = NEW.paciente_id;

  IF v_psico_usuario IS NOT NULL AND v_pac_usuario IS NOT NULL AND v_psico_usuario = v_pac_usuario THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Un especialista no puede agendar citas clínicas consigo mismo.';
  END IF;
END$$

DROP TRIGGER IF EXISTS trg_no_autoatencion_citas_update$$
CREATE TRIGGER trg_no_autoatencion_citas_update
BEFORE UPDATE ON citas_sesiones
FOR EACH ROW
BEGIN
  DECLARE v_psico_usuario INT;
  DECLARE v_pac_usuario INT;

  SELECT usuario_id INTO v_psico_usuario FROM psicologos WHERE id = NEW.psicologo_id;
  SELECT usuario_id INTO v_pac_usuario FROM pacientes WHERE id = NEW.paciente_id;

  IF v_psico_usuario IS NOT NULL AND v_pac_usuario IS NOT NULL AND v_psico_usuario = v_pac_usuario THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Un especialista no puede agendar citas clínicas consigo mismo.';
  END IF;
END$$

DELIMITER ;
