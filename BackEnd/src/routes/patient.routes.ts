import { Router, Request, Response } from 'express';
import crypto from 'node:crypto';
import { pool } from '../config/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import type { PoolConnection } from 'mysql2/promise';
import { emailService } from '../services/emailService';
import { authMiddleware, requireRole, requireActiveSubscription } from '../middlewares/authMiddleware';
import { TokenPayload } from '../config/jwt';
import { getUserAvailableRoles } from './auth.routes';

export const patientRouter = Router();

// Blindaje global: Todos los endpoints clínicos de pacientes requieren autenticación JWT
patientRouter.use(authMiddleware);

/**
 * Obtiene el ID del psicólogo asociado a un usuario autenticado.
 */
async function getPsicologoIdByUserId(userId: number): Promise<number | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT id FROM psicologos WHERE usuario_id = ? LIMIT 1',
    [userId]
  );
  return rows.length > 0 ? rows[0].id : null;
}

/**
 * Parsea el objeto JSON del suplente activo si viene serializado como string desde MySQL.
 */
function parseSuplenteActivo(raw: unknown): unknown {
  if (!raw) {
    return null;
  }
  return typeof raw === 'string' ? JSON.parse(raw) : raw;
}

/**
 * GET /api/patients/recent?limit=5
 * Retorna los pacientes más recientes asignados EXCLUSIVAMENTE al psicólogo autenticado.
 */
patientRouter.get('/recent', requireRole('psicologo', 'admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 5, 1), 50);
    const psicologoId = await getPsicologoIdByUserId(req.user!.userId);

    if (!psicologoId && req.user!.role !== 'admin') {
      res.status(403).json({
        success: false,
        error: 'No se encontró un perfil de especialista asociado a tu cuenta.',
      });
      return;
    }

    let rows: RowDataPacket[] = [];

    if (psicologoId) {
      [rows] = await pool.query<RowDataPacket[]>(
        `SELECT 
          pac.id,
          pac.nombre, 
          pac.apellido_paterno, 
          pac.apellido_materno, 
          COALESCE(TIMESTAMPDIFF(YEAR, pac.fecha_nacimiento, CURDATE()), pac.edad) as edad, 
          DATE_FORMAT(pac.fecha_nacimiento, '%Y-%m-%d') as fecha_nacimiento, 
          pac.genero, 
          pac.email, 
          DATE_FORMAT(r.fecha_primera_sesion, '%Y-%m-%d') as fecha_primera_sesion,
          DATE_FORMAT(pac.created_at, '%Y-%m-%d %H:%i:%s') as created_at,
          r.tipo_relacion,
          DATE_FORMAT(r.fecha_fin_suplencia, '%Y-%m-%d') as fecha_fin_suplencia,
          (
            SELECT JSON_OBJECT(
              'psicologo_id', s_psi.id,
              'nombre', CONCAT('Ps. ', s_psi.nombre, ' ', s_psi.apellidos),
              'email', s_psi.email,
              'fecha_fin_suplencia', DATE_FORMAT(s_rel.fecha_fin_suplencia, '%Y-%m-%d')
            )
            FROM relacion_psicologo_paciente s_rel
            JOIN psicologos s_psi ON s_psi.id = s_rel.psicologo_id
            WHERE s_rel.paciente_id = pac.id
              AND s_rel.tipo_relacion = 'suplente'
              AND s_rel.estado = 'activo'
              AND (s_rel.fecha_fin_suplencia IS NULL OR s_rel.fecha_fin_suplencia >= CURDATE())
            LIMIT 1
          ) as suplente_activo
        FROM pacientes pac
        JOIN relacion_psicologo_paciente r ON pac.id = r.paciente_id
        WHERE r.psicologo_id = ?
          AND r.estado = 'activo'
          AND (r.tipo_relacion = 'titular' OR r.fecha_fin_suplencia IS NULL OR r.fecha_fin_suplencia >= CURDATE())
        ORDER BY pac.created_at DESC 
        LIMIT ?`,
        [psicologoId, limit]
      );
    } else {
      // Solo rol 'admin'
      [rows] = await pool.query<RowDataPacket[]>(
        `SELECT 
          pac.id,
          pac.nombre, 
          pac.apellido_paterno, 
          pac.apellido_materno, 
          COALESCE(TIMESTAMPDIFF(YEAR, pac.fecha_nacimiento, CURDATE()), pac.edad) as edad, 
          DATE_FORMAT(pac.fecha_nacimiento, '%Y-%m-%d') as fecha_nacimiento, 
          pac.genero, 
          pac.email, 
          DATE_FORMAT(COALESCE(r.fecha_primera_sesion, pac.fecha_nacimiento), '%Y-%m-%d') as fecha_primera_sesion,
          DATE_FORMAT(pac.created_at, '%Y-%m-%d %H:%i:%s') as created_at,
          r.tipo_relacion,
          DATE_FORMAT(r.fecha_fin_suplencia, '%Y-%m-%d') as fecha_fin_suplencia
        FROM pacientes pac
        LEFT JOIN relacion_psicologo_paciente r ON pac.id = r.paciente_id
        ORDER BY pac.created_at DESC 
        LIMIT ?`,
        [limit]
      );
    }

    const formattedRows = rows.map((r) => {
      let suplente_activo = null;
      if (r.suplente_activo) {
        suplente_activo = typeof r.suplente_activo === 'string' ? JSON.parse(r.suplente_activo) : r.suplente_activo;
      }
      return { ...r, suplente_activo };
    });

    res.json({ success: true, data: formattedRows });
  } catch (error) {
    console.error('Error en GET /api/patients/recent:', error);
    res.status(500).json({ success: false, error: 'Error al consultar pacientes recientes' });
  }
});

/**
 * GET /api/patients/today
 * Retorna los pacientes que tienen una consulta o cita el mismo día que se está revisando el sistema (CURDATE()).
 * Verifica tanto citas_sesiones (para hoy) como relacion_psicologo_paciente (fecha_primera_sesion hoy).
 */
patientRouter.get('/today', requireRole('psicologo', 'admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const psicologoId = await getPsicologoIdByUserId(req.user!.userId);

    if (!psicologoId && req.user!.role !== 'admin') {
      res.status(403).json({
        success: false,
        error: 'No se encontró un perfil de especialista asociado a tu cuenta.',
      });
      return;
    }

    let rows: RowDataPacket[] = [];

    if (psicologoId) {
      [rows] = await pool.query<RowDataPacket[]>(
        `SELECT DISTINCT
          pac.id,
          pac.nombre, 
          pac.apellido_paterno, 
          pac.apellido_materno, 
          COALESCE(TIMESTAMPDIFF(YEAR, pac.fecha_nacimiento, CURDATE()), pac.edad) as edad, 
          DATE_FORMAT(pac.fecha_nacimiento, '%Y-%m-%d') as fecha_nacimiento, 
          pac.genero, 
          pac.email, 
          DATE_FORMAT(r.fecha_primera_sesion, '%Y-%m-%d') as fecha_primera_sesion,
          DATE_FORMAT(pac.created_at, '%Y-%m-%d %H:%i:%s') as created_at,
          COALESCE(DATE_FORMAT(cs.fecha_hora_inicio, '%H:%i'), '09:00') as hora_cita,
          COALESCE(cs.modalidad, 'presencial') as modalidad_cita,
          COALESCE(cs.estado, 'programada') as estado_cita,
          COALESCE(cs.rol_psicologo, r.tipo_relacion) as rol_cita,
          COALESCE(cs.fecha_hora_inicio, r.fecha_primera_sesion) as fecha_orden,
          r.tipo_relacion,
          DATE_FORMAT(r.fecha_fin_suplencia, '%Y-%m-%d') as fecha_fin_suplencia,
          (
            SELECT JSON_OBJECT(
              'psicologo_id', s_psi.id,
              'nombre', CONCAT('Ps. ', s_psi.nombre, ' ', s_psi.apellidos),
              'email', s_psi.email,
              'fecha_fin_suplencia', DATE_FORMAT(s_rel.fecha_fin_suplencia, '%Y-%m-%d')
            )
            FROM relacion_psicologo_paciente s_rel
            JOIN psicologos s_psi ON s_psi.id = s_rel.psicologo_id
            WHERE s_rel.paciente_id = pac.id
              AND s_rel.tipo_relacion = 'suplente'
              AND s_rel.estado = 'activo'
              AND (s_rel.fecha_fin_suplencia IS NULL OR s_rel.fecha_fin_suplencia >= CURDATE())
            LIMIT 1
          ) as suplente_activo
        FROM pacientes pac
        JOIN relacion_psicologo_paciente r ON pac.id = r.paciente_id
        LEFT JOIN citas_sesiones cs ON cs.paciente_id = pac.id 
          AND cs.psicologo_id = ? 
          AND DATE(cs.fecha_hora_inicio) = CURDATE()
          AND cs.estado != 'cancelada'
        WHERE r.psicologo_id = ?
          AND r.estado = 'activo'
          AND (r.tipo_relacion = 'titular' OR r.fecha_fin_suplencia IS NULL OR r.fecha_fin_suplencia >= CURDATE())
          AND (
            (r.fecha_primera_sesion = CURDATE() AND (cs.id IS NULL OR cs.estado != 'cancelada'))
            OR (cs.id IS NOT NULL AND cs.estado != 'cancelada')
          )
        ORDER BY fecha_orden ASC`,
        [psicologoId, psicologoId]
      );
    } else {
      [rows] = await pool.query<RowDataPacket[]>(
        `SELECT DISTINCT
          pac.id,
          pac.nombre, 
          pac.apellido_paterno, 
          pac.apellido_materno, 
          COALESCE(TIMESTAMPDIFF(YEAR, pac.fecha_nacimiento, CURDATE()), pac.edad) as edad, 
          DATE_FORMAT(pac.fecha_nacimiento, '%Y-%m-%d') as fecha_nacimiento, 
          pac.genero, 
          pac.email, 
          DATE_FORMAT(r.fecha_primera_sesion, '%Y-%m-%d') as fecha_primera_sesion,
          DATE_FORMAT(pac.created_at, '%Y-%m-%d %H:%i:%s') as created_at,
          COALESCE(DATE_FORMAT(cs.fecha_hora_inicio, '%H:%i'), '09:00') as hora_cita,
          COALESCE(cs.modalidad, 'presencial') as modalidad_cita,
          COALESCE(cs.estado, 'programada') as estado_cita,
          COALESCE(cs.rol_psicologo, r.tipo_relacion) as rol_cita,
          COALESCE(cs.fecha_hora_inicio, r.fecha_primera_sesion) as fecha_orden,
          r.tipo_relacion,
          DATE_FORMAT(r.fecha_fin_suplencia, '%Y-%m-%d') as fecha_fin_suplencia
        FROM pacientes pac
        LEFT JOIN relacion_psicologo_paciente r ON pac.id = r.paciente_id
        LEFT JOIN citas_sesiones cs ON cs.paciente_id = pac.id 
          AND DATE(cs.fecha_hora_inicio) = CURDATE()
          AND cs.estado != 'cancelada'
        WHERE (
          (r.fecha_primera_sesion = CURDATE() AND (cs.id IS NULL OR cs.estado != 'cancelada'))
          OR (cs.id IS NOT NULL AND cs.estado != 'cancelada')
        )
        ORDER BY fecha_orden ASC`
      );
    }

    const formattedRows = rows.map((r) => {
      let suplente_activo = null;
      if (r.suplente_activo) {
        suplente_activo = typeof r.suplente_activo === 'string' ? JSON.parse(r.suplente_activo) : r.suplente_activo;
      }
      return { ...r, suplente_activo };
    });

    res.json({ success: true, data: formattedRows });
  } catch (error) {
    console.error('Error en GET /api/patients/today:', error);
    res.status(500).json({ success: false, error: 'Error al consultar pacientes del día' });
  }
});

interface ProfileIdentifierResult {
  identifier: string;
  error?: string;
}

/**
 * Resuelve y valida el identificador de búsqueda para la ficha clínica según el rol del usuario.
 */
function resolveProfileSearchIdentifier(
  user: TokenPayload,
  queryEmail: unknown,
  queryName: unknown
): ProfileIdentifierResult {
  if (user.role === 'paciente') {
    return { identifier: user.email.toLowerCase() };
  }

  const email = typeof queryEmail === 'string' ? queryEmail.trim().toLowerCase() : '';
  const name = typeof queryName === 'string' ? queryName.trim() : '';
  const identifier = email || name;

  if (!identifier) {
    return { identifier: '', error: 'Se requiere el correo o identificador del paciente' };
  }

  return { identifier };
}

/**
 * Consulta la base de datos para obtener los datos de la ficha clínica del paciente.
 */
async function fetchPatientProfileRecord(
  user: TokenPayload,
  identifier: string
): Promise<RowDataPacket | null> {
  let querySql = `
    SELECT 
      pac.id,
      pac.usuario_id,
      pac.nombre, 
      pac.apellido_paterno, 
      pac.apellido_materno, 
      COALESCE(TIMESTAMPDIFF(YEAR, pac.fecha_nacimiento, CURDATE()), pac.edad) as edad, 
      DATE_FORMAT(pac.fecha_nacimiento, '%Y-%m-%d') as fecha_nacimiento, 
      pac.genero, 
      pac.email, 
      DATE_FORMAT(r.fecha_primera_sesion, '%Y-%m-%d') as fecha_primera_sesion,
      r.psicologo_id,
      psi.nombre as doctor_nombre,
      psi.apellidos as doctor_apellidos,
      (
        SELECT JSON_OBJECT(
          'id', s_psi.id,
          'nombre', CONCAT('Ps. ', s_psi.nombre, ' ', s_psi.apellidos),
          'email', s_psi.email,
          'fecha_fin_suplencia', DATE_FORMAT(s_rel.fecha_fin_suplencia, '%Y-%m-%d')
        )
        FROM relacion_psicologo_paciente s_rel
        JOIN psicologos s_psi ON s_psi.id = s_rel.psicologo_id
        WHERE s_rel.paciente_id = pac.id
          AND s_rel.tipo_relacion = 'suplente'
          AND s_rel.estado = 'activo'
          AND (s_rel.fecha_fin_suplencia IS NULL OR s_rel.fecha_fin_suplencia >= CURDATE())
        LIMIT 1
      ) as suplente_activo
    FROM pacientes pac
    LEFT JOIN usuarios u ON u.id = pac.usuario_id
    LEFT JOIN relacion_psicologo_paciente r ON pac.id = r.paciente_id AND r.tipo_relacion = 'titular' AND r.estado = 'activo'
    LEFT JOIN psicologos psi ON psi.id = r.psicologo_id
  `;
  const params: any[] = [];

  if (user.role === 'paciente') {
    querySql += ' WHERE pac.usuario_id = ? OR LOWER(pac.email) = ? LIMIT 1';
    params.push(user.userId, user.email.toLowerCase());
  } else {
    querySql += ' WHERE LOWER(pac.email) = ? OR LOWER(u.email) = ? OR pac.nombre = ? OR CONCAT(pac.nombre, \' \', pac.apellido_paterno) = ? LIMIT 1';
    params.push(identifier, identifier, identifier, identifier);
  }

  const [rows] = await pool.query<RowDataPacket[]>(querySql, params);
  return rows[0] || null;
}

/**
 * Valida que un psicólogo tenga formalmente asignado al paciente bajo su supervisión (Anti-BOLA).
 */
async function validateProfileAccess(
  user: TokenPayload,
  pacienteId: number
): Promise<{ status: number; error: string } | null> {
  if (user.role !== 'psicologo') {
    return null;
  }

  const psicologoId = await getPsicologoIdByUserId(user.userId);
  if (!psicologoId) {
    return { status: 403, error: 'Perfil de especialista no encontrado.' };
  }

  const [authRel] = await pool.query<RowDataPacket[]>(
    `SELECT id FROM relacion_psicologo_paciente 
     WHERE psicologo_id = ? AND paciente_id = ? AND estado = 'activo'
       AND (tipo_relacion = 'titular' OR fecha_fin_suplencia IS NULL OR fecha_fin_suplencia >= CURDATE())
     LIMIT 1`,
    [psicologoId, pacienteId]
  );

  if (authRel.length === 0) {
    return {
      status: 403,
      error: 'Acceso denegado: Este paciente no se encuentra asignado a tu supervisión clínica.',
    };
  }

  return null;
}

/**
 * Construye el objeto de respuesta del perfil clínico del paciente.
 */
function formatPatientProfile(p: RowDataPacket, availableRoles: string[]) {
  const especialista = p.doctor_nombre
    ? `Ps. ${p.doctor_nombre} ${p.doctor_apellidos}`
    : 'Sin especialista asignado';

  return {
    id: p.id,
    nombre: p.nombre,
    apellido_paterno: p.apellido_paterno,
    apellido_materno: p.apellido_materno,
    edad: p.edad,
    fecha_nacimiento: p.fecha_nacimiento,
    genero: p.genero,
    email: p.email,
    fecha_primera_sesion: p.fecha_primera_sesion,
    especialista,
    suplente: parseSuplenteActivo(p.suplente_activo),
    availableRoles,
    hasMultipleRoles: availableRoles.length > 1,
  };
}

/**
 * GET /api/patients/profile?email=...&name=...
 * Consulta la ficha clínica con validación estricta de propiedad (Ownership Check / Anti-BOLA):
 * - Paciente: solo puede consultar su propia ficha.
 * - Psicólogo: solo puede consultar pacientes que tenga formalmente asignados.
 */
patientRouter.get('/profile', async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const target = resolveProfileSearchIdentifier(user, req.query.email, req.query.name);

    if (target.error) {
      res.status(400).json({ success: false, error: target.error });
      return;
    }

    const p = await fetchPatientProfileRecord(user, target.identifier);
    if (!p) {
      res.status(404).json({ success: false, error: 'Paciente no encontrado en el sistema' });
      return;
    }

    const accessError = await validateProfileAccess(user, p.id);
    if (accessError) {
      res.status(accessError.status).json({ success: false, error: accessError.error });
      return;
    }

    const targetUserId = p.usuario_id ?? user.userId;
    const availableRoles = await getUserAvailableRoles(targetUserId);

    res.json({
      success: true,
      data: formatPatientProfile(p, availableRoles),
    });
  } catch (error) {
    console.error('Error en GET /api/patients/profile:', error);
    res.status(500).json({ success: false, error: 'Error al consultar perfil del paciente' });
  }
});

/**
 * GET /api/patients
 * Retorna el listado completo de pacientes asignados exclusivamente al especialista autenticado.
 */
patientRouter.get('/', requireRole('psicologo', 'admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    let rows: RowDataPacket[] = [];

    if (user.role === 'psicologo') {
      const psicologoId = await getPsicologoIdByUserId(user.userId);
      if (!psicologoId) {
        res.status(403).json({ success: false, error: 'Perfil de especialista no encontrado.' });
        return;
      }

      [rows] = await pool.query<RowDataPacket[]>(
        `SELECT 
          pac.id,
          pac.nombre, 
          pac.apellido_paterno, 
          pac.apellido_materno, 
          COALESCE(TIMESTAMPDIFF(YEAR, pac.fecha_nacimiento, CURDATE()), pac.edad) as edad, 
          DATE_FORMAT(pac.fecha_nacimiento, '%Y-%m-%d') as fecha_nacimiento, 
          pac.genero, 
          pac.email, 
          DATE_FORMAT(r.fecha_primera_sesion, '%Y-%m-%d') as fecha_primera_sesion,
          DATE_FORMAT(pac.created_at, '%Y-%m-%d %H:%i:%s') as created_at,
          r.tipo_relacion,
          DATE_FORMAT(r.fecha_fin_suplencia, '%Y-%m-%d') as fecha_fin_suplencia,
          (
            SELECT JSON_OBJECT(
              'psicologo_id', s_psi.id,
              'nombre', CONCAT('Ps. ', s_psi.nombre, ' ', s_psi.apellidos),
              'email', s_psi.email,
              'fecha_fin_suplencia', DATE_FORMAT(s_rel.fecha_fin_suplencia, '%Y-%m-%d')
            )
            FROM relacion_psicologo_paciente s_rel
            JOIN psicologos s_psi ON s_psi.id = s_rel.psicologo_id
            WHERE s_rel.paciente_id = pac.id
              AND s_rel.tipo_relacion = 'suplente'
              AND s_rel.estado = 'activo'
              AND (s_rel.fecha_fin_suplencia IS NULL OR s_rel.fecha_fin_suplencia >= CURDATE())
            LIMIT 1
          ) as suplente_activo
        FROM pacientes pac
        JOIN relacion_psicologo_paciente r ON pac.id = r.paciente_id
        WHERE r.psicologo_id = ?
          AND r.estado = 'activo'
          AND (r.tipo_relacion = 'titular' OR r.fecha_fin_suplencia IS NULL OR r.fecha_fin_suplencia >= CURDATE())
        ORDER BY pac.created_at DESC`,
        [psicologoId]
      );
    } else {
      // Rol 'admin'
      [rows] = await pool.query<RowDataPacket[]>(
        `SELECT 
          pac.id,
          pac.nombre, 
          pac.apellido_paterno, 
          pac.apellido_materno, 
          COALESCE(TIMESTAMPDIFF(YEAR, pac.fecha_nacimiento, CURDATE()), pac.edad) as edad, 
          DATE_FORMAT(pac.fecha_nacimiento, '%Y-%m-%d') as fecha_nacimiento, 
          pac.genero, 
          pac.email, 
          DATE_FORMAT(COALESCE(r.fecha_primera_sesion, pac.fecha_nacimiento), '%Y-%m-%d') as fecha_primera_sesion,
          DATE_FORMAT(pac.created_at, '%Y-%m-%d %H:%i:%s') as created_at,
          r.tipo_relacion,
          DATE_FORMAT(r.fecha_fin_suplencia, '%Y-%m-%d') as fecha_fin_suplencia
        FROM pacientes pac
        LEFT JOIN relacion_psicologo_paciente r ON pac.id = r.paciente_id
        ORDER BY pac.created_at DESC`
      );
    }

    const formattedRows = rows.map((r) => {
      let suplente_activo = null;
      if (r.suplente_activo) {
        suplente_activo = typeof r.suplente_activo === 'string' ? JSON.parse(r.suplente_activo) : r.suplente_activo;
      }
      return { ...r, suplente_activo };
    });

    res.json({ success: true, data: formattedRows });
  } catch (error) {
    console.error('Error en GET /api/patients:', error);
    res.status(500).json({ success: false, error: 'Error al listar pacientes' });
  }
});

interface SpecialistTarget {
  targetPsicologoId: number;
  doctorName: string;
}

interface SessionAppointmentParams {
  fecha?: string;
  hora?: string;
  duracion?: number | string;
  modalidad?: string;
  observaciones?: string;
}

interface FirstSessionParams extends SessionAppointmentParams {
  psicologoId: number;
  pacienteId: number;
}

interface ExistingPatientRecord {
  id: number;
  nombre: string;
  apellido_paterno: string;
}

interface NewPatientParams {
  usuarioId: number;
  nombre: string;
  apellido_paterno: string;
  apellido_materno?: string;
  edad: number;
  fecha_nacimiento?: string;
  genero?: string;
  email: string;
  created_at?: string;
  targetPsicologoId: number;
  fecha_primera_sesion?: string;
}

interface ExistingPatientAssignmentResult {
  status: number;
  body: {
    success: boolean;
    error?: string;
    message?: string;
    data?: {
      id: number;
      nombre: string;
      apellido_paterno: string;
      email: string;
      fecha_primera_sesion?: string;
    };
  };
}

/**
 * Determina el especialista autenticado asignado para la relación clínica o un fallback predeterminado.
 */
async function resolveTargetSpecialist(user: TokenPayload): Promise<SpecialistTarget> {
  if (user.role === 'psicologo') {
    const [psiRows] = await pool.query<RowDataPacket[]>(
      'SELECT id, usuario_id, nombre, apellidos FROM psicologos WHERE usuario_id = ? LIMIT 1',
      [user.userId]
    );
    if (psiRows.length > 0) {
      return {
        targetPsicologoId: psiRows[0].id,
        doctorName: `Ps. ${psiRows[0].nombre} ${psiRows[0].apellidos}`,
      };
    }
  }

  const [firstDoc] = await pool.query<RowDataPacket[]>('SELECT id, nombre, apellidos FROM psicologos LIMIT 1');
  if (firstDoc.length > 0) {
    return {
      targetPsicologoId: firstDoc[0].id,
      doctorName: `Ps. ${firstDoc[0].nombre} ${firstDoc[0].apellidos}`,
    };
  }

  return {
    targetPsicologoId: 1,
    doctorName: 'tu especialista',
  };
}

/**
 * Registra la primera sesión clínica en la tabla citas_sesiones.
 */
async function registerFirstAppointmentSession(params: FirstSessionParams): Promise<void> {
  const sessionDate = params.fecha || new Date().toISOString().split('T')[0];
  const sessionTime = (params.hora || '10:00').trim();
  const durationMinutes = Number(params.duracion) || 60;
  const sessionModality = params.modalidad === 'online' ? 'online' : 'presencial';
  const sessionNotes = (params.observaciones || 'Primera sesión de apertura de ficha clínica').trim();
  const startDateTime = `${sessionDate} ${sessionTime}`;

  await pool.query(
    `INSERT INTO citas_sesiones 
      (psicologo_id, paciente_id, fecha_hora_inicio, fecha_hora_fin, modalidad, estado, observaciones, rol_psicologo)
     VALUES (
       ?, 
       ?, 
       STR_TO_DATE(?, '%Y-%m-%d %H:%i'), 
       DATE_ADD(STR_TO_DATE(?, '%Y-%m-%d %H:%i'), INTERVAL ? MINUTE), 
       ?, 
       IF(DATE_ADD(STR_TO_DATE(?, '%Y-%m-%d %H:%i'), INTERVAL ? MINUTE) < NOW(), 'completada', 'programada'), 
       ?,
       'titular'
     )`,
    [
      params.psicologoId,
      params.pacienteId,
      startDateTime,
      startDateTime,
      durationMinutes,
      sessionModality,
      startDateTime,
      durationMinutes,
      sessionNotes,
    ]
  );
}

/**
 * Calcula la edad exacta del paciente a partir de su fecha de nacimiento o edad provista.
 */
function calculatePatientAge(edadInput: unknown, fechaNacimiento?: string | null): number {
  let finalEdad = Number(edadInput) || 0;
  if (!fechaNacimiento) {
    return finalEdad;
  }

  const birth = new Date(fechaNacimiento);
  if (Number.isNaN(birth.getTime())) {
    return finalEdad;
  }

  const today = new Date();
  let calc = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    calc--;
  }
  if (calc >= 0) {
    finalEdad = calc;
  }

  return finalEdad;
}

/**
 * Resuelve un usuario existente en la tabla usuarios o crea uno nuevo para el paciente.
 */
async function resolveOrCreatePatientUser(email: string): Promise<number> {
  const [existingUsers] = await pool.query<RowDataPacket[]>(
    'SELECT id, rol FROM usuarios WHERE email = ? LIMIT 1',
    [email]
  );

  if (existingUsers.length > 0) {
    const usuarioId = existingUsers[0].id;
    await pool.query("UPDATE usuarios SET rol = 'ambos' WHERE id = ?", [usuarioId]);
    return usuarioId;
  }

  const [userResult] = await pool.query<ResultSetHeader>(
    `INSERT INTO usuarios (email, password_hash, rol, activo, debe_crear_password) 
     VALUES (?, NULL, 'paciente', TRUE, TRUE)`,
    [email]
  );
  return userResult.insertId;
}

/**
 * Valida un paciente ya registrado y devuelve un error descriptivo según su estado clínico actual.
 */
async function assignExistingPatient(
  patient: ExistingPatientRecord,
  targetPsicologoId: number,
  _targetEmail: string,
  _sessionParams: SessionAppointmentParams
): Promise<ExistingPatientAssignmentResult> {
  // 1. Verificar si el psicólogo solicitante ya lo tiene activo
  const [myActiveRel] = await pool.query<RowDataPacket[]>(
    "SELECT id, tipo_relacion FROM relacion_psicologo_paciente WHERE psicologo_id = ? AND paciente_id = ? AND estado = 'activo' LIMIT 1",
    [targetPsicologoId, patient.id]
  );

  if (myActiveRel.length > 0) {
    const relType = myActiveRel[0].tipo_relacion === 'suplente' ? 'suplente' : 'titular';
    return {
      status: 409,
      body: {
        success: false,
        error: `Este paciente ya se encuentra actualmente en tu lista clínica activa como ${relType}.`,
      },
    };
  }

  // 2. Verificar si otro especialista lo tiene activo actualmente
  const [otherActiveRel] = await pool.query<RowDataPacket[]>(
    `SELECT psi.nombre, psi.apellidos, r.tipo_relacion 
     FROM relacion_psicologo_paciente r
     JOIN psicologos psi ON psi.id = r.psicologo_id
     WHERE r.paciente_id = ? AND r.estado = 'activo' AND r.psicologo_id != ?
     ORDER BY r.tipo_relacion = 'titular' DESC
     LIMIT 1`,
    [patient.id, targetPsicologoId]
  );

  if (otherActiveRel.length > 0) {
    const doctorName = `Ps. ${otherActiveRel[0].nombre} ${otherActiveRel[0].apellidos}`;
    return {
      status: 409,
      body: {
        success: false,
        error: `Este paciente ya se encuentra registrado bajo la supervisión de ${doctorName}. Para atenderlo, debes solicitar una suplencia o traspaso desde la pestaña "Paciente ya registrado".`,
      },
    };
  }

  // 3. El paciente existe en el sistema pero no está activo con ningún especialista
  return {
    status: 409,
    body: {
      success: false,
      error: `El paciente ${patient.nombre} ${patient.apellido_paterno} ya cuenta con una ficha clínica registrada en el sistema pero no está activo. Para volver a atenderlo, vincúlalo desde la pestaña "Paciente ya registrado".`,
    },
  };
}

/**
 * Inserta la ficha de un paciente nuevo y vincula la relación con el especialista.
 */
async function createNewPatientRecord(params: NewPatientParams): Promise<number> {
  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO pacientes 
      (usuario_id, nombre, apellido_paterno, apellido_materno, edad, fecha_nacimiento, genero, email, created_at) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, NOW()))`,
    [
      params.usuarioId,
      params.nombre.trim(),
      params.apellido_paterno.trim(),
      (params.apellido_materno || '').trim(),
      params.edad,
      params.fecha_nacimiento,
      params.genero,
      params.email,
      params.created_at || null,
    ]
  );

  const pacienteId = result.insertId;

  await pool.query(
    `INSERT INTO relacion_psicologo_paciente 
      (psicologo_id, paciente_id, fecha_primera_sesion, estado) 
     VALUES (?, ?, COALESCE(?, CURDATE()), 'activo') 
     ON DUPLICATE KEY UPDATE fecha_primera_sesion = VALUES(fecha_primera_sesion)`,
    [params.targetPsicologoId, pacienteId, params.fecha_primera_sesion || null]
  );

  return pacienteId;
}

/**
 * POST /api/patients
 * Registra un nuevo paciente vinculándolo automáticamente al especialista autenticado.
 */
patientRouter.post(
  '/',
  requireRole('psicologo', 'admin'),
  requireActiveSubscription,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        nombre,
        apellido_paterno,
        apellido_materno,
        edad,
        fecha_nacimiento,
        genero,
        fecha_primera_sesion,
        email,
        created_at,
        hora_primera_sesion,
        duracion_primera_sesion,
        modalidad_primera_sesion,
        observaciones_primera_sesion,
      } = req.body;

      if (!nombre || !apellido_paterno || !email) {
        res.status(400).json({ success: false, error: 'Faltan campos obligatorios (nombre, apellido_paterno, email)' });
        return;
      }

      const targetEmail = String(email).trim().toLowerCase();

      // 1. Prohibir estrictamente autoatención clínica (ética y confidencialidad)
      if (req.user?.email.toLowerCase() === targetEmail) {
        res.status(400).json({
          success: false,
          error: 'No puedes registrarte a ti mismo como tu propio paciente. Por razones éticas y de supervisión clínica, debes ser registrado por otro especialista.',
        });
        return;
      }

      // 2. Determinar el especialista autenticado para la relación clínica
      const { targetPsicologoId, doctorName } = await resolveTargetSpecialist(req.user!);

      // 3. Verificar si el paciente ya tiene ficha clínica registrada
      const [existingPatients] = await pool.query<RowDataPacket[]>(
        'SELECT id, usuario_id, nombre, apellido_paterno FROM pacientes WHERE email = ? LIMIT 1',
        [targetEmail]
      );

      const sessionParams: SessionAppointmentParams = {
        fecha: fecha_primera_sesion,
        hora: hora_primera_sesion,
        duracion: duracion_primera_sesion,
        modalidad: modalidad_primera_sesion,
        observaciones: observaciones_primera_sesion,
      };

      if (existingPatients.length > 0) {
        const assignmentResult = await assignExistingPatient(
          existingPatients[0] as ExistingPatientRecord,
          targetPsicologoId,
          targetEmail,
          sessionParams
        );
        res.status(assignmentResult.status).json(assignmentResult.body);
        return;
      }

      // 4. Determinar o crear cuenta en tabla `usuarios`
      const usuarioId = await resolveOrCreatePatientUser(targetEmail);

      // 5. Determinar edad exacta al registrar a partir de la fecha de nacimiento
      const finalEdad = calculatePatientAge(edad, fecha_nacimiento);

      // Insertar ficha clínica en tabla `pacientes` y relacionar
      const pacienteId = await createNewPatientRecord({
        usuarioId,
        nombre,
        apellido_paterno,
        apellido_materno,
        edad: finalEdad,
        fecha_nacimiento,
        genero,
        email: targetEmail,
        created_at,
        targetPsicologoId,
        fecha_primera_sesion,
      });

      // 6. Registrar la primera sesión en citas_sesiones
      await registerFirstAppointmentSession({
        psicologoId: targetPsicologoId,
        pacienteId,
        ...sessionParams,
      });

      // 7. Enviar correo de bienvenida al paciente
      const patientFullName = `${nombre.trim()} ${apellido_paterno.trim()}`;
      emailService.sendPatientWelcomeEmail({
        to: targetEmail,
        patientName: patientFullName,
        doctorName,
      }).catch((err) => {
        console.warn('[patientRouter] Advertencia al enviar correo:', err);
      });

      res.status(201).json({
        success: true,
        data: {
          id: pacienteId,
          nombre,
          apellido_paterno,
          apellido_materno,
          edad: finalEdad,
          fecha_nacimiento,
          genero,
          fecha_primera_sesion,
          email: targetEmail,
          created_at: created_at || new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Error en POST /api/patients:', error);
      res.status(500).json({ success: false, error: 'Error al registrar paciente' });
    }
  }
);

/**
 * POST /api/patients/lookup
 * Permite al psicólogo buscar si un paciente ya está registrado en PsicoHábitos.
 * Retorna los datos básicos y si ya tiene asignado un especialista titular o suplente.
 */
patientRouter.post(
  '/lookup',
  requireRole('psicologo', 'admin'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { email } = req.body;
      if (!email || !String(email).trim()) {
        res.status(400).json({ success: false, error: 'Por favor ingresa el correo del paciente.' });
        return;
      }

      const cleanEmail = String(email).trim().toLowerCase();
      const psicologoId = await getPsicologoIdByUserId(req.user!.userId);

      // 1. Buscar paciente por email
      const [pacRows] = await pool.query<RowDataPacket[]>(
        `SELECT id, nombre, apellido_paterno, apellido_materno, 
          COALESCE(TIMESTAMPDIFF(YEAR, fecha_nacimiento, CURDATE()), edad) as edad,
          DATE_FORMAT(fecha_nacimiento, '%Y-%m-%d') as fecha_nacimiento,
          genero, email
         FROM pacientes 
         WHERE LOWER(email) = ? 
         LIMIT 1`,
        [cleanEmail]
      );

      if (pacRows.length === 0) {
        res.json({
          success: true,
          exists: false,
          message: 'No se encontró ningún paciente registrado con este correo.',
        });
        return;
      }

      const patient = pacRows[0];

      // 2. Verificar si el psicólogo solicitante ya tiene una relación activa con este paciente
      if (psicologoId) {
        const [myRel] = await pool.query<RowDataPacket[]>(
          `SELECT tipo_relacion, fecha_fin_suplencia 
           FROM relacion_psicologo_paciente 
           WHERE psicologo_id = ? AND paciente_id = ? AND estado = 'activo'
           LIMIT 1`,
          [psicologoId, patient.id]
        );

        if (myRel.length > 0) {
          const relType = myRel[0].tipo_relacion === 'suplente' ? 'suplente' : 'titular';
          res.json({
            success: true,
            exists: true,
            alreadyAssigned: true,
            patient,
            message: `Este paciente ya se encuentra actualmente en tu lista de atención clínica como ${relType}.`,
          });
          return;
        }
      }

      // 3. Obtener el titular actual del paciente (si tiene)
      const [titularRows] = await pool.query<RowDataPacket[]>(
        `SELECT psi.id, CONCAT('Ps. ', psi.nombre, ' ', psi.apellidos) as doctor_nombre, psi.email
         FROM relacion_psicologo_paciente r
         JOIN psicologos psi ON psi.id = r.psicologo_id
         WHERE r.paciente_id = ? AND r.tipo_relacion = 'titular' AND r.estado = 'activo'
         LIMIT 1`,
        [patient.id]
      );

      // 4. Obtener si hay suplente activo actualmente
      const [suplenteRows] = await pool.query<RowDataPacket[]>(
        `SELECT psi.id, CONCAT('Ps. ', psi.nombre, ' ', psi.apellidos) as suplente_nombre, psi.email,
          DATE_FORMAT(r.fecha_fin_suplencia, '%Y-%m-%d') as fecha_fin_suplencia
         FROM relacion_psicologo_paciente r
         JOIN psicologos psi ON psi.id = r.psicologo_id
         WHERE r.paciente_id = ? AND r.tipo_relacion = 'suplente' AND r.estado = 'activo'
           AND (r.fecha_fin_suplencia IS NULL OR r.fecha_fin_suplencia >= CURDATE())
         LIMIT 1`,
        [patient.id]
      );

      const hasTitular = titularRows.length > 0;
      const currentSpecialist = hasTitular ? titularRows[0].doctor_nombre : null;
      const currentSuplente = suplenteRows.length > 0 ? suplenteRows[0].suplente_nombre : null;

      res.json({
        success: true,
        exists: true,
        alreadyAssigned: false,
        patient,
        hasTitular,
        currentSpecialist,
        currentSuplente,
        suplenteInfo: suplenteRows.length > 0 ? suplenteRows[0] : null,
      });
    } catch (error) {
      console.error('Error en POST /api/patients/lookup:', error);
      res.status(500).json({ success: false, error: 'Error al buscar paciente.' });
    }
  }
);

/**
 * POST /api/patients/send-titular-otp
 * Genera y envía un código OTP de 6 dígitos al correo del paciente para autorizar
 * el traspaso de titularidad o la vinculación como suplente temporal (vigencia 15 min).
 */
patientRouter.post(
  '/send-titular-otp',
  requireRole('psicologo', 'admin'),
  requireActiveSubscription,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { paciente_id, tipo_relacion, fecha_fin_suplencia } = req.body;

      if (!paciente_id) {
        res.status(400).json({ success: false, error: 'ID de paciente requerido.' });
        return;
      }

      const relType = tipo_relacion === 'suplente' ? 'suplente' : 'titular';
      if (relType === 'suplente' && !fecha_fin_suplencia) {
        res.status(400).json({ success: false, error: 'La fecha de fin de suplencia es obligatoria para modalidad suplente.' });
        return;
      }

      const psicologoId = await getPsicologoIdByUserId(req.user!.userId);
      if (!psicologoId) {
        res.status(403).json({ success: false, error: 'Perfil de especialista no encontrado.' });
        return;
      }

      // Obtener datos del paciente
      const [pacRows] = await pool.query<RowDataPacket[]>(
        'SELECT id, nombre, apellido_paterno, email FROM pacientes WHERE id = ? LIMIT 1',
        [paciente_id]
      );
      if (pacRows.length === 0) {
        res.status(404).json({ success: false, error: 'Paciente no encontrado.' });
        return;
      }
      const pac = pacRows[0];

      // Obtener datos del psicólogo solicitante
      const [psiRows] = await pool.query<RowDataPacket[]>(
        'SELECT nombre, apellidos FROM psicologos WHERE id = ? LIMIT 1',
        [psicologoId]
      );
      const psiName = psiRows.length > 0 ? `Ps. ${psiRows[0].nombre} ${psiRows[0].apellidos}` : 'Especialista';

      // Generar código numérico de 6 dígitos seguro con crypto
      const code = crypto.randomInt(100000, 1000000).toString();

      // Invalidar códigos anteriores no usados para este paciente y psicólogo
      await pool.query(
        'UPDATE codigos_traspaso_titularidad SET usado = TRUE WHERE paciente_id = ? AND nuevo_psicologo_id = ? AND usado = FALSE',
        [pac.id, psicologoId]
      );

      // Insertar nuevo código con vigencia de 15 minutos
      await pool.query(
        `INSERT INTO codigos_traspaso_titularidad (paciente_id, nuevo_psicologo_id, codigo, expira_en, usado)
         VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 15 MINUTE), FALSE)`,
        [pac.id, psicologoId, code]
      );

      // Enviar correo con plantilla HTML responsiva
      const patientFullName = `${pac.nombre} ${pac.apellido_paterno}`;
      emailService.sendTransferAuthorizationEmail({
        to: pac.email,
        patientName: patientFullName,
        newPsychologistName: psiName,
        relationType: relType,
        endDate: fecha_fin_suplencia,
        code,
      }).catch((err) => {
        console.warn('[send-titular-otp] Advertencia al enviar correo OTP:', err);
      });

      res.json({
        success: true,
        message: `Código de autorización enviado exitosamente al correo ${pac.email}.`,
        patientEmail: pac.email,
      });
    } catch (error) {
      console.error('Error en POST /api/patients/send-titular-otp:', error);
      res.status(500).json({ success: false, error: 'Error al enviar código de autorización.' });
    }
  }
);

interface UpsertRelationshipParams {
  pacienteId: number;
  psicologoId: number;
  tipoRelacion: 'titular' | 'suplente';
  firstSessionDate: string;
  fechaFinSuplencia: string | null;
}

interface ApplyRelationshipParams {
  pacienteId: number;
  psicologoId: number;
  relType: 'titular' | 'suplente';
  firstSessionDate: string;
  fechaFinSuplencia?: string | null;
}

interface ScheduleLinkedSessionParams {
  psicologoId: number;
  pacienteId: number;
  relType: 'titular' | 'suplente';
  firstSessionDate: string;
  hora?: string;
  duracion?: number | string;
  modalidad?: string;
  observaciones?: string;
}

/**
 * Valida que el código OTP exista, no haya expirado y no haya sido utilizado, marcándolo como usado.
 */
async function validateAndConsumeTransferOtp(
  connection: PoolConnection,
  pacienteId: number,
  psicologoId: number,
  cleanOtp: string
): Promise<boolean> {
  const [otpRows] = await connection.query<RowDataPacket[]>(
    `SELECT id, codigo, expira_en, usado 
     FROM codigos_traspaso_titularidad 
     WHERE paciente_id = ? 
       AND nuevo_psicologo_id = ? 
       AND codigo = ? 
       AND usado = FALSE 
       AND expira_en > NOW() 
     ORDER BY id DESC 
     LIMIT 1`,
    [pacienteId, psicologoId, cleanOtp]
  );

  if (otpRows.length === 0) {
    return false;
  }

  await connection.query(
    'UPDATE codigos_traspaso_titularidad SET usado = TRUE WHERE id = ?',
    [otpRows[0].id]
  );

  return true;
}

/**
 * Crea o actualiza la relación clínica del psicólogo con el paciente.
 */
async function upsertPsicologoPacienteRelacion(
  connection: PoolConnection,
  params: UpsertRelationshipParams
): Promise<void> {
  const { pacienteId, psicologoId, tipoRelacion, firstSessionDate, fechaFinSuplencia } = params;
  const [existing] = await connection.query<RowDataPacket[]>(
    'SELECT id FROM relacion_psicologo_paciente WHERE psicologo_id = ? AND paciente_id = ? LIMIT 1',
    [psicologoId, pacienteId]
  );

  if (existing.length > 0) {
    await connection.query(
      `UPDATE relacion_psicologo_paciente 
       SET tipo_relacion = ?, estado = 'activo', fecha_primera_sesion = ?, fecha_fin_suplencia = ? 
       WHERE id = ?`,
      [tipoRelacion, firstSessionDate, fechaFinSuplencia, existing[0].id]
    );
  } else {
    await connection.query(
      `INSERT INTO relacion_psicologo_paciente 
       (psicologo_id, paciente_id, fecha_primera_sesion, estado, tipo_relacion, fecha_fin_suplencia) 
       VALUES (?, ?, ?, 'activo', ?, ?)`,
      [psicologoId, pacienteId, firstSessionDate, tipoRelacion, fechaFinSuplencia]
    );
  }
}

/**
 * Aplica las reglas de negocio de traspaso titular o suplencia en la relación clínica.
 */
async function applyPatientRelationship(
  connection: PoolConnection,
  params: ApplyRelationshipParams
): Promise<void> {
  const { pacienteId, psicologoId, relType, firstSessionDate, fechaFinSuplencia } = params;

  if (relType === 'titular') {
    // Traspaso de titularidad: Marcar el titular anterior como 'inactivo'
    await connection.query(
      "UPDATE relacion_psicologo_paciente SET estado = 'inactivo' WHERE paciente_id = ? AND tipo_relacion = 'titular'",
      [pacienteId]
    );

    // Cancelar automáticamente todas las citas futuras pendientes del paciente con cualquier otro especialista
    await connection.query(
      `UPDATE citas_sesiones 
       SET estado = 'cancelada', 
           observaciones = CONCAT(COALESCE(observaciones, ''), ' · [Cancelada automáticamente por traspaso definitivo de titularidad]')
       WHERE paciente_id = ? 
         AND psicologo_id != ? 
         AND estado = 'programada' 
         AND fecha_hora_inicio >= NOW()`,
      [pacienteId, psicologoId]
    );
  }

  await upsertPsicologoPacienteRelacion(connection, {
    pacienteId,
    psicologoId,
    tipoRelacion: relType,
    firstSessionDate,
    fechaFinSuplencia: relType === 'suplente' ? (fechaFinSuplencia || null) : null,
  });
}

/**
 * Agenda la primera sesión clínica con el nuevo especialista dentro de la transacción.
 */
async function scheduleInitialLinkedSession(
  connection: PoolConnection,
  params: ScheduleLinkedSessionParams
): Promise<void> {
  const {
    psicologoId,
    pacienteId,
    relType,
    firstSessionDate,
    hora,
    duracion,
    modalidad,
    observaciones,
  } = params;

  const firstSessionTime = (hora || '10:00').trim();
  const firstDuration = Number(duracion) || 60;
  const firstModality = modalidad === 'online' ? 'online' : 'presencial';
  const roleLabel = relType === 'suplente' ? 'Suplencia' : 'Titular';
  const defaultNotes = `Primera sesión (${roleLabel})`;
  const firstNotes = (observaciones || defaultNotes).trim();
  const startDateTimeStr = `${firstSessionDate} ${firstSessionTime}`;

  await connection.query(
    `INSERT INTO citas_sesiones 
     (psicologo_id, paciente_id, fecha_hora_inicio, fecha_hora_fin, modalidad, estado, observaciones, rol_psicologo)
     VALUES (
       ?, ?, 
       STR_TO_DATE(?, '%Y-%m-%d %H:%i'), 
       DATE_ADD(STR_TO_DATE(?, '%Y-%m-%d %H:%i'), INTERVAL ? MINUTE), 
       ?, 
       IF(DATE_ADD(STR_TO_DATE(?, '%Y-%m-%d %H:%i'), INTERVAL ? MINUTE) < NOW(), 'completada', 'programada'), 
       ?,
       ?
     )`,
    [
      psicologoId,
      pacienteId,
      startDateTimeStr,
      startDateTimeStr,
      firstDuration,
      firstModality,
      startDateTimeStr,
      firstDuration,
      firstNotes,
      relType,
    ]
  );
}

/**
 * Obtiene la ficha actualizada del paciente tras completar la vinculación.
 */
async function getLinkedPatientSummary(
  pacienteId: number,
  psicologoId: number
): Promise<RowDataPacket | null> {
  const [pacData] = await pool.query<RowDataPacket[]>(
    `SELECT pac.id, pac.nombre, pac.apellido_paterno, pac.apellido_materno, 
      COALESCE(TIMESTAMPDIFF(YEAR, pac.fecha_nacimiento, CURDATE()), pac.edad) as edad,
      DATE_FORMAT(pac.fecha_nacimiento, '%Y-%m-%d') as fecha_nacimiento,
      pac.genero, pac.email,
      DATE_FORMAT(r.fecha_primera_sesion, '%Y-%m-%d') as fecha_primera_sesion,
      r.tipo_relacion,
      DATE_FORMAT(r.fecha_fin_suplencia, '%Y-%m-%d') as fecha_fin_suplencia
     FROM pacientes pac
     JOIN relacion_psicologo_paciente r ON pac.id = r.paciente_id
     WHERE pac.id = ? AND r.psicologo_id = ?
     LIMIT 1`,
    [pacienteId, psicologoId]
  );

  return pacData.length > 0 ? pacData[0] : null;
}

/**
 * POST /api/patients/link-existing
 * Valida el código OTP de autorización y concreta la vinculación del paciente
 * en modalidad titular o suplente, agendando de inmediato la primera sesión clínica.
 */
patientRouter.post(
  '/link-existing',
  requireRole('psicologo', 'admin'),
  requireActiveSubscription,
  async (req: Request, res: Response): Promise<void> => {
    const {
      paciente_id,
      tipo_relacion,
      fecha_fin_suplencia,
      fecha_primera_sesion,
      hora_primera_sesion,
      duracion_primera_sesion,
      modalidad_primera_sesion,
      observaciones_primera_sesion,
      codigo_otp,
    } = req.body;

    if (!paciente_id || !codigo_otp) {
      res.status(400).json({ success: false, error: 'Faltan campos obligatorios (paciente_id, codigo_otp).' });
      return;
    }

    const psicologoId = await getPsicologoIdByUserId(req.user!.userId);
    if (!psicologoId) {
      res.status(403).json({ success: false, error: 'Perfil de especialista no encontrado.' });
      return;
    }

    const relType: 'titular' | 'suplente' = tipo_relacion === 'suplente' ? 'suplente' : 'titular';
    if (relType === 'suplente' && !fecha_fin_suplencia) {
      res.status(400).json({ success: false, error: 'Debe especificarse la fecha de término de la suplencia.' });
      return;
    }

    const cleanOtp = String(codigo_otp).trim();
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const isValidOtp = await validateAndConsumeTransferOtp(connection, paciente_id, psicologoId, cleanOtp);
      if (!isValidOtp) {
        await connection.rollback();
        res.status(400).json({
          success: false,
          error: 'Código de autorización incorrecto o expirado. Por favor solicita uno nuevo.',
        });
        return;
      }

      const firstSessionDate = (fecha_primera_sesion || new Date().toISOString().split('T')[0]).trim();

      await applyPatientRelationship(connection, {
        pacienteId: paciente_id,
        psicologoId,
        relType,
        firstSessionDate,
        fechaFinSuplencia: fecha_fin_suplencia || null,
      });

      await scheduleInitialLinkedSession(connection, {
        psicologoId,
        pacienteId: paciente_id,
        relType,
        firstSessionDate,
        hora: hora_primera_sesion,
        duracion: duracion_primera_sesion,
        modalidad: modalidad_primera_sesion,
        observaciones: observaciones_primera_sesion,
      });

      await connection.commit();

      const pacData = await getLinkedPatientSummary(paciente_id, psicologoId);
      const successMessage = relType === 'suplente'
        ? 'Paciente vinculado en modalidad suplente exitosamente.'
        : 'Traspaso de titularidad completado exitosamente.';

      res.status(201).json({
        success: true,
        message: successMessage,
        data: pacData || { id: paciente_id },
      });
    } catch (error) {
      await connection.rollback();
      console.error('Error en POST /api/patients/link-existing:', error);
      res.status(500).json({ success: false, error: 'Error al vincular el paciente existente.' });
    } finally {
      connection.release();
    }
  }
);

/**
 * POST /api/patients/end-substitution
 * Permite al psicólogo titular, al psicólogo suplente o al propio paciente
 * finalizar de forma anticipada la suplencia activa.
 */
patientRouter.post(
  '/end-substitution',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { paciente_id } = req.body;
      const user = req.user!;

      if (!paciente_id) {
        res.status(400).json({ success: false, error: 'ID de paciente requerido.' });
        return;
      }

      // Validar permisos: La revocación de la suplencia es una decisión exclusiva del paciente
      if (user.role === 'psicologo') {
        res.status(403).json({
          success: false,
          error: 'Acceso denegado: La revocación o finalización de una suplencia activa es una decisión exclusiva del paciente.',
        });
        return;
      }

      if (user.role === 'paciente') {
        // Verificar que el usuario sea el paciente
        const [pacRows] = await pool.query<RowDataPacket[]>(
          'SELECT id FROM pacientes WHERE id = ? AND (usuario_id = ? OR LOWER(email) = ?) LIMIT 1',
          [paciente_id, user.userId, user.email.toLowerCase()]
        );
        if (pacRows.length === 0) {
          res.status(403).json({ success: false, error: 'No tienes autorización para modificar esta ficha clínica.' });
          return;
        }
      }

      // 1. Obtener la suplencia activa para identificar al psicólogo suplente
      const [suplenteRows] = await pool.query<RowDataPacket[]>(
        `SELECT r.id, r.psicologo_id, CONCAT(psi.nombre, ' ', psi.apellidos) as suplente_nombre
         FROM relacion_psicologo_paciente r
         JOIN psicologos psi ON psi.id = r.psicologo_id
         WHERE r.paciente_id = ? AND r.tipo_relacion = 'suplente' AND r.estado = 'activo'
         LIMIT 1`,
        [paciente_id]
      );

      if (suplenteRows.length === 0) {
        res.status(404).json({ success: false, error: 'No se encontró una suplencia activa para este paciente.' });
        return;
      }

      const suplenteId = suplenteRows[0].psicologo_id;
      const suplenteNombre = suplenteRows[0].suplente_nombre;

      // 2. Finalizar la relación de suplencia activa
      await pool.query(
        `UPDATE relacion_psicologo_paciente 
         SET estado = 'inactivo' 
         WHERE paciente_id = ? AND tipo_relacion = 'suplente' AND estado = 'activo'`,
        [paciente_id]
      );

      // 3. Opción A: Cancelar automáticamente todas las citas futuras pendientes con dicho suplente
      const [cancelResult] = await pool.query<ResultSetHeader>(
        `UPDATE citas_sesiones 
         SET estado = 'cancelada', 
             observaciones = CONCAT(
               COALESCE(observaciones, ''), 
               IF(COALESCE(observaciones, '') = '', '', ' · '), 
               '[Cancelada automáticamente por revocación de suplencia]'
             )
         WHERE paciente_id = ? 
           AND psicologo_id = ? 
           AND estado = 'programada' 
           AND fecha_hora_inicio >= NOW()`,
        [paciente_id, suplenteId]
      );

      const canceladasCount = cancelResult.affectedRows;

      res.json({
        success: true,
        message: canceladasCount > 0
          ? `La cobertura de suplencia con ${suplenteNombre} ha sido finalizada y se cancelaron ${canceladasCount} sesión(es) futura(s) pendiente(s).`
          : `La cobertura de suplencia con ${suplenteNombre} ha sido finalizada exitosamente.`,
        data: {
          sesionesCanceladas: canceladasCount,
        },
      });
    } catch (error) {
      console.error('Error en POST /api/patients/end-substitution:', error);
      res.status(500).json({ success: false, error: 'Error al finalizar la suplencia.' });
    }
  }
);

