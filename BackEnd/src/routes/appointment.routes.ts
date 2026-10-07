import { Router, Request, Response } from 'express';
import { pool } from '../config/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { authMiddleware, requireRole, requireActiveSubscription } from '../middlewares/authMiddleware';

export const appointmentRouter = Router();

// Blindaje global: Requiere autenticación JWT en todas las operaciones
appointmentRouter.use(authMiddleware);

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
 * Convierte un valor de fecha (Date o string) a formato YYYY-MM-DD.
 */
function toISODateString(val: unknown): string | null {
  if (!val) return null;
  if (val instanceof Date) {
    return val.toISOString().split('T')[0];
  }
  if (typeof val === 'string') {
    return val.split('T')[0];
  }
  return null;
}

/**
 * Formatea una fecha YYYY-MM-DD a DD/MM/YYYY.
 */
function formatChileDate(dStr: string): string {
  const parts = dStr.split('-');
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : dStr;
}

/**
 * Normaliza y formatea el estado de la cita ('Completada', 'Cancelada', 'Programada').
 */
function formatEstadoCita(estado: unknown): string {
  if (estado === 'completada') {
    return 'Completada';
  }
  if (estado === 'cancelada') {
    return 'Cancelada';
  }
  return 'Programada';
}

/**
 * Determina el ID del psicólogo según el rol del usuario autenticado.
 */
async function resolvePsicologoId(userRole: string, userId: number): Promise<number | null> {
  if (userRole === 'psicologo') {
    return getPsicologoIdByUserId(userId);
  }
  const [firstDoc] = await pool.query<RowDataPacket[]>(
    'SELECT id FROM psicologos LIMIT 1'
  );
  return firstDoc.length > 0 ? firstDoc[0].id : 1;
}

/**
 * Verifica si existe una suplencia activa que impida al titular agendar en la fecha seleccionada.
 */
async function checkActiveSuplenteRestriction(pacienteId: number, fecha: string): Promise<string | null> {
  const [suplenteRows] = await pool.query<RowDataPacket[]>(
    `SELECT r.fecha_fin_suplencia, ps.nombre AS suplente_nombre
     FROM relacion_psicologo_paciente r
     JOIN psicologos ps ON r.psicologo_id = ps.id
     WHERE r.paciente_id = ? AND r.tipo_relacion = 'suplente' AND r.estado = 'activo'
       AND (r.fecha_fin_suplencia IS NULL OR r.fecha_fin_suplencia >= CURDATE())
     LIMIT 1`,
    [pacienteId]
  );

  if (suplenteRows.length === 0) return null;

  const suplenteEndStr = toISODateString(suplenteRows[0].fecha_fin_suplencia);
  if (suplenteEndStr && fecha <= suplenteEndStr) {
    return `No puedes agendar citas durante el periodo de suplencia activa (hasta el ${formatChileDate(suplenteEndStr)}). Puedes programar sesiones a partir del día siguiente.`;
  }
  return null;
}

/**
 * Valida la relación del especialista con el paciente y las restricciones de suplencia.
 */
async function validatePsychologistAssignment(
  psicologoId: number,
  pacienteId: number,
  fecha: string
): Promise<{ status?: number; error?: string; rolPsicologo: 'titular' | 'suplente' }> {
  const [relRows] = await pool.query<RowDataPacket[]>(
    'SELECT id, tipo_relacion, fecha_fin_suplencia FROM relacion_psicologo_paciente WHERE psicologo_id = ? AND paciente_id = ? AND estado = "activo" LIMIT 1',
    [psicologoId, pacienteId]
  );

  if (relRows.length === 0) {
    return {
      status: 403,
      error: 'Acceso denegado: El paciente no se encuentra asignado a tu supervisión.',
      rolPsicologo: 'titular',
    };
  }

  const userRel = relRows[0];
  const rolPsicologo: 'titular' | 'suplente' = userRel.tipo_relacion === 'suplente' ? 'suplente' : 'titular';

  if (rolPsicologo === 'titular') {
    const suplenteError = await checkActiveSuplenteRestriction(pacienteId, fecha);
    if (suplenteError) {
      return { status: 400, error: suplenteError, rolPsicologo };
    }
  } else if (userRel.fecha_fin_suplencia) {
    const suplenteEndStr = toISODateString(userRel.fecha_fin_suplencia);
    if (suplenteEndStr && fecha > suplenteEndStr) {
      return {
        status: 400,
        error: `Tu periodo de suplencia finaliza el ${formatChileDate(suplenteEndStr)}. No puedes programar sesiones posteriores a esa fecha.`,
        rolPsicologo,
      };
    }
  }

  return { rolPsicologo };
}

/**
 * POST /api/appointments
 * Permite al psicólogo agendar una nueva sesión con un paciente asignado.
 */
appointmentRouter.post(
  '/',
  requireRole('psicologo', 'admin'),
  requireActiveSubscription,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        paciente_id,
        fecha, // YYYY-MM-DD
        hora,  // HH:mm
        duracion, // 30, 45, 60, 75, 90
        modalidad, // 'presencial' | 'online'
        observaciones,
      } = req.body;

      if (!paciente_id || !fecha || !hora) {
        res.status(400).json({
          success: false,
          error: 'Faltan campos obligatorios (paciente_id, fecha, hora).',
        });
        return;
      }

      // 1. Obtener ID del psicólogo
      const targetPsicologoId = await resolvePsicologoId(req.user!.role, req.user!.userId);
      if (!targetPsicologoId) {
        res.status(403).json({
          success: false,
          error: 'No se encontró un perfil de especialista asociado a tu cuenta.',
        });
        return;
      }

      let rolPsicologo: 'titular' | 'suplente' = 'titular';

      // 2. Anti-BOLA: Verificar que el paciente esté asignado a este especialista y suplencias
      if (req.user!.role === 'psicologo') {
        const assignment = await validatePsychologistAssignment(targetPsicologoId, paciente_id, fecha);
        if (assignment.error) {
          res.status(assignment.status || 400).json({
            success: false,
            error: assignment.error,
          });
          return;
        }
        rolPsicologo = assignment.rolPsicologo;
      }

      const durationMinutes = Number(duracion) || 60;
      const modalityClean = modalidad === 'online' ? 'online' : 'presencial';
      const cleanNotes = (observaciones || '').trim();
      const startDateTimeStr = `${fecha} ${hora}`;

      // 3. Insertar sesión en `citas_sesiones`
      const [insertResult] = await pool.query<ResultSetHeader>(
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
           ?
         )`,
        [
          targetPsicologoId,
          paciente_id,
          startDateTimeStr,
          startDateTimeStr,
          durationMinutes,
          modalityClean,
          startDateTimeStr,
          durationMinutes,
          cleanNotes,
          rolPsicologo,
        ]
      );

      res.status(201).json({
        success: true,
        message: 'Sesión agendada exitosamente.',
        data: {
          id: insertResult.insertId,
          paciente_id,
          fecha,
          hora,
          duracion: durationMinutes,
          modalidad: modalityClean,
          observaciones: cleanNotes,
        },
      });
    } catch (error) {
      console.error('Error en POST /api/appointments:', error);
      res.status(500).json({ success: false, error: 'Error al agendar la sesión clínica.' });
    }
  }
);

/**
 * GET /api/appointments/patient/:patientId
 * Retorna todas las sesiones de un paciente asignado, ordenadas de más reciente a más antigua.
 */
appointmentRouter.get(
  '/patient/:patientId',
  requireRole('psicologo', 'admin'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const patientId = Number(req.params.patientId);
      if (!patientId) {
        res.status(400).json({ success: false, error: 'ID de paciente inválido.' });
        return;
      }

      let psicologoId: number | null = null;
      if (req.user!.role === 'psicologo') {
        psicologoId = await getPsicologoIdByUserId(req.user!.userId);
        if (!psicologoId) {
          res.status(403).json({ success: false, error: 'Perfil de especialista no encontrado.' });
          return;
        }

        // Anti-BOLA: Verificar relación
        const [rel] = await pool.query<RowDataPacket[]>(
          'SELECT id FROM relacion_psicologo_paciente WHERE psicologo_id = ? AND paciente_id = ? LIMIT 1',
          [psicologoId, patientId]
        );
        if (rel.length === 0) {
          res.status(403).json({
            success: false,
            error: 'No tienes permiso para ver las citas de este paciente.',
          });
          return;
        }
      }

      // Obtener todas las sesiones de citas_sesiones del paciente asignado
      const querySql = `
        SELECT 
          cs.id,
          cs.paciente_id,
          cs.psicologo_id,
          DATE_FORMAT(cs.fecha_hora_inicio, '%Y-%m-%d') as fecha,
          DATE_FORMAT(cs.fecha_hora_inicio, '%H:%i') as hora,
          DATE_FORMAT(cs.fecha_hora_fin, '%H:%i') as hora_fin,
          TIMESTAMPDIFF(MINUTE, cs.fecha_hora_inicio, cs.fecha_hora_fin) as duracion,
          cs.modalidad,
          IF(cs.fecha_hora_fin < NOW() AND cs.estado = 'programada', 'completada', cs.estado) as estado,
          COALESCE(cs.observaciones, '') as observaciones,
          CONCAT('Ps. ', psi.nombre, ' ', psi.apellidos) as doctor_nombre,
          DATE_FORMAT(cs.fecha_hora_inicio, '%Y-%m-%d %H:%i:%s') as fecha_hora_inicio,
          (
            CASE 
              WHEN COALESCE(cs.rol_psicologo, 'titular') = 'suplente' THEN 'suplente'
              WHEN EXISTS (
                SELECT 1 FROM relacion_psicologo_paciente r 
                WHERE r.psicologo_id = cs.psicologo_id 
                  AND r.paciente_id = cs.paciente_id 
                  AND r.tipo_relacion = 'titular' 
                  AND r.estado = 'activo'
              ) THEN 'titular_actual'
              ELSE 'titular_anterior'
            END
          ) as tipo_especialista
        FROM citas_sesiones cs
        LEFT JOIN psicologos psi ON psi.id = cs.psicologo_id
        WHERE cs.paciente_id = ?
        ORDER BY cs.fecha_hora_inicio DESC
      `;

      const [rows] = await pool.query<RowDataPacket[]>(querySql, [patientId]);

      res.json({
        success: true,
        data: rows.map((r) => ({
          id: String(r.id),
          fecha: r.fecha,
          hora: r.hora,
          horaFin: r.hora_fin,
          duracion: String(r.duracion || 60),
          modalidad: r.modalidad,
          estado: formatEstadoCita(r.estado),
          observaciones: r.observaciones,
          motivo: r.observaciones, // Compatibilidad retroactiva
          doctorNombre: r.doctor_nombre || 'Especialista',
          esPropia: psicologoId ? r.psicologo_id === psicologoId : true,
          tipoEspecialista: (r.tipo_especialista || 'titular_actual') as 'titular_actual' | 'suplente' | 'titular_anterior',
        })),
      });
    } catch (error) {
      console.error('Error en GET /api/appointments/patient/:patientId:', error);
      res.status(500).json({ success: false, error: 'Error al consultar sesiones del paciente.' });
    }
  }
);

/**
 * GET /api/appointments/psychologist/calendar
 * Retorna las citas del especialista para la vista de calendario (con soporte de filtro opcional por mes o fecha).
 */
appointmentRouter.get(
  '/psychologist/calendar',
  requireRole('psicologo', 'admin'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      let psicologoId: number | null = null;
      if (req.user!.role === 'psicologo') {
        psicologoId = await getPsicologoIdByUserId(req.user!.userId);
        if (!psicologoId) {
          res.status(403).json({ success: false, error: 'Perfil de especialista no encontrado.' });
          return;
        }
      }

      const { month, date } = req.query; // month: 'YYYY-MM', date: 'YYYY-MM-DD'

      let querySql = `
        SELECT 
          cs.id,
          cs.paciente_id,
          CONCAT(p.nombre, ' ', p.apellido_paterno, IF(p.apellido_materno IS NOT NULL AND p.apellido_materno != '', CONCAT(' ', p.apellido_materno), '')) as paciente_nombre,
          p.email as paciente_email,
          DATE_FORMAT(cs.fecha_hora_inicio, '%Y-%m-%d') as fecha,
          DATE_FORMAT(cs.fecha_hora_inicio, '%H:%i') as hora_inicio,
          DATE_FORMAT(cs.fecha_hora_fin, '%H:%i') as hora_fin,
          TIMESTAMPDIFF(MINUTE, cs.fecha_hora_inicio, cs.fecha_hora_fin) as duracion,
          cs.modalidad,
          IF(cs.fecha_hora_fin < NOW() AND cs.estado = 'programada', 'completada', cs.estado) as estado,
          COALESCE(cs.observaciones, '') as observaciones,
          COALESCE(cs.rol_psicologo, 'titular') as rol_psicologo
        FROM citas_sesiones cs
        JOIN pacientes p ON p.id = cs.paciente_id
        WHERE 1=1
      `;
      const params: any[] = [];

      if (psicologoId) {
        querySql += ' AND cs.psicologo_id = ?';
        params.push(psicologoId);
      }

      if (date && typeof date === 'string') {
        querySql += ' AND DATE(cs.fecha_hora_inicio) = ?';
        params.push(date);
      } else if (month && typeof month === 'string') {
        querySql += " AND DATE_FORMAT(cs.fecha_hora_inicio, '%Y-%m') = ?";
        params.push(month);
      }

      querySql += ' ORDER BY cs.fecha_hora_inicio ASC';

      const [rows] = await pool.query<RowDataPacket[]>(querySql, params);

      res.json({
        success: true,
        data: rows,
      });
    } catch (error) {
      console.error('Error en GET /api/appointments/psychologist/calendar:', error);
      res.status(500).json({ success: false, error: 'Error al consultar calendario de citas.' });
    }
  }
);

/**
 * GET /api/appointments/my-sessions
 * Retorna las citas del paciente autenticado divididas en próximas e historial.
 */
appointmentRouter.get(
  '/my-sessions',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const user = req.user!;

      // 1. Localizar paciente_id por usuario_id o email
      const [pacRows] = await pool.query<RowDataPacket[]>(
        'SELECT id, nombre, apellido_paterno FROM pacientes WHERE usuario_id = ? OR LOWER(email) = ? LIMIT 1',
        [user.userId, user.email.toLowerCase()]
      );

      if (pacRows.length === 0) {
        res.status(404).json({ success: false, error: 'Ficha de paciente no encontrada.' });
        return;
      }

      const pacienteId = pacRows[0].id;

      // 2. Consultar citas y especialista
      const [rows] = await pool.query<RowDataPacket[]>(
        `SELECT 
          cs.id,
          DATE_FORMAT(cs.fecha_hora_inicio, '%Y-%m-%d') as fecha,
          DATE_FORMAT(cs.fecha_hora_inicio, '%H:%i') as hora,
          DATE_FORMAT(cs.fecha_hora_fin, '%H:%i') as hora_fin,
          TIMESTAMPDIFF(MINUTE, cs.fecha_hora_inicio, cs.fecha_hora_fin) as duracion,
          cs.modalidad,
          IF(cs.fecha_hora_fin < NOW() AND cs.estado = 'programada', 'completada', cs.estado) as estado,
          COALESCE(cs.observaciones, '') as observaciones,
          CONCAT('Ps. ', psi.nombre, ' ', psi.apellidos) as doctor_nombre,
          cs.fecha_hora_inicio,
          IF(cs.fecha_hora_inicio >= NOW() AND cs.estado != 'cancelada', 1, 0) as es_futura,
          (
            CASE 
              WHEN COALESCE(cs.rol_psicologo, 'titular') = 'suplente' THEN 'suplente'
              WHEN EXISTS (
                SELECT 1 FROM relacion_psicologo_paciente r 
                WHERE r.psicologo_id = cs.psicologo_id 
                  AND r.paciente_id = cs.paciente_id 
                  AND r.tipo_relacion = 'titular' 
                  AND r.estado = 'activo'
              ) THEN 'titular_actual'
              ELSE 'titular_anterior'
            END
          ) as tipo_especialista
        FROM citas_sesiones cs
        JOIN psicologos psi ON psi.id = cs.psicologo_id
        WHERE cs.paciente_id = ?
        ORDER BY cs.fecha_hora_inicio DESC`,
        [pacienteId]
      );

      const proximas: any[] = [];
      const historial: any[] = [];

      for (const row of rows) {
        const item = {
          id: String(row.id),
          fecha: row.fecha,
          hora: row.hora,
          horaFin: row.hora_fin,
          duracion: `${row.duracion || 60} min`,
          modalidad: row.modalidad === 'online' ? 'online' : 'presencial',
          estado: formatEstadoCita(row.estado),
          observaciones: row.observaciones,
          doctorNombre: row.doctor_nombre,
          tipoEspecialista: (row.tipo_especialista || 'titular_actual') as 'titular_actual' | 'suplente' | 'titular_anterior',
        };

        if (row.es_futura === 1) {
          proximas.push(item);
        } else {
          historial.push(item);
        }
      }

      // Ordenar próximas de más cercana a más lejana (cronológico ascendente)
      proximas.reverse();

      res.json({
        success: true,
        data: {
          proximas,
          historial,
        },
      });
    } catch (error) {
      console.error('Error en GET /api/appointments/my-sessions:', error);
      res.status(500).json({ success: false, error: 'Error al consultar citas del paciente.' });
    }
  }
);

/**
 * Obtiene y valida que una cita exista y se encuentre en estado programada para su modificación.
 */
async function getAppointmentForModification(
  appointmentId: number,
  psicologoId: number | null
): Promise<{ status?: number; error?: string; appointment?: RowDataPacket }> {
  let checkSql = 'SELECT * FROM citas_sesiones WHERE id = ? LIMIT 1';
  const checkParams: any[] = [appointmentId];
  if (psicologoId) {
    checkSql = 'SELECT * FROM citas_sesiones WHERE id = ? AND psicologo_id = ? LIMIT 1';
    checkParams.push(psicologoId);
  }

  const [existingRows] = await pool.query<RowDataPacket[]>(checkSql, checkParams);
  if (existingRows.length === 0) {
    return {
      status: 404,
      error: 'Cita no encontrada o no tienes permiso para modificarla.',
    };
  }

  const currentApt = existingRows[0];
  if (currentApt.estado !== 'programada') {
    return {
      status: 400,
      error: 'Solo se pueden modificar sesiones que se encuentren en estado programada.',
    };
  }

  return { appointment: currentApt };
}

/**
 * Verifica si existe una suplencia activa que impida al titular reprogramar la sesión.
 */
async function checkTitularRescheduleRestriction(
  pacienteId: number,
  fecha: string
): Promise<string | null> {
  const [activeSuplente] = await pool.query<RowDataPacket[]>(
    `SELECT r.fecha_fin_suplencia, ps.nombre AS suplente_nombre
     FROM relacion_psicologo_paciente r
     JOIN psicologos ps ON r.psicologo_id = ps.id
     WHERE r.paciente_id = ? AND r.tipo_relacion = 'suplente' AND r.estado = 'activo'
       AND (r.fecha_fin_suplencia IS NULL OR r.fecha_fin_suplencia >= CURDATE())
     LIMIT 1`,
    [pacienteId]
  );

  if (activeSuplente.length === 0) {
    return null;
  }

  const suplenteEndStr = toISODateString(activeSuplente[0].fecha_fin_suplencia);
  if (suplenteEndStr && fecha <= suplenteEndStr) {
    return `No puedes reprogramar la cita para una fecha cubierta por la suplencia activa (hasta el ${formatChileDate(suplenteEndStr)}).`;
  }

  return null;
}

/**
 * Valida las restricciones de suplencia (titular o suplente) al reprogramar una cita.
 */
async function checkRescheduleRestrictions(
  psicologoId: number,
  pacienteId: number,
  fecha: string
): Promise<string | null> {
  const [currentRel] = await pool.query<RowDataPacket[]>(
    'SELECT tipo_relacion, fecha_fin_suplencia FROM relacion_psicologo_paciente WHERE psicologo_id = ? AND paciente_id = ? AND estado = "activo" LIMIT 1',
    [psicologoId, pacienteId]
  );

  if (currentRel.length === 0) {
    return null;
  }

  const userRel = currentRel[0];
  if (userRel.tipo_relacion === 'titular') {
    return checkTitularRescheduleRestriction(pacienteId, fecha);
  }

  if (userRel.tipo_relacion === 'suplente' && userRel.fecha_fin_suplencia) {
    const suplenteEndStr = toISODateString(userRel.fecha_fin_suplencia);
    if (suplenteEndStr && fecha > suplenteEndStr) {
      return `Tu periodo de suplencia finaliza el ${formatChileDate(suplenteEndStr)}. No puedes reprogramar sesiones posteriores a esa fecha.`;
    }
  }

  return null;
}

/**
 * Verifica si existe un cruce de horarios con otra cita del mismo psicólogo.
 */
async function hasScheduleConflict(
  psicologoId: number,
  appointmentId: number,
  startDateTimeStr: string,
  durationMinutes: number
): Promise<boolean> {
  const [conflictRows] = await pool.query<RowDataPacket[]>(
    `SELECT id FROM citas_sesiones 
     WHERE psicologo_id = ? 
       AND id != ? 
       AND estado != 'cancelada'
       AND (
         (fecha_hora_inicio < DATE_ADD(STR_TO_DATE(?, '%Y-%m-%d %H:%i'), INTERVAL ? MINUTE))
         AND
         (fecha_hora_fin > STR_TO_DATE(?, '%Y-%m-%d %H:%i'))
       )
     LIMIT 1`,
    [psicologoId, appointmentId, startDateTimeStr, durationMinutes, startDateTimeStr]
  );

  return conflictRows.length > 0;
}

/**
 * PUT /api/appointments/:id
 * Permite al especialista modificar una sesión que se encuentre programada.
 */
appointmentRouter.put(
  '/:id',
  requireRole('psicologo', 'admin'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const appointmentId = Number(req.params.id);
      if (!appointmentId) {
        res.status(400).json({ success: false, error: 'ID de cita inválido.' });
        return;
      }

      const { fecha, hora, duracion, modalidad, observaciones } = req.body;
      if (!fecha || !hora) {
        res.status(400).json({ success: false, error: 'Faltan campos requeridos (fecha, hora).' });
        return;
      }

      let psicologoId: number | null = null;
      if (req.user!.role === 'psicologo') {
        psicologoId = await getPsicologoIdByUserId(req.user!.userId);
        if (!psicologoId) {
          res.status(403).json({ success: false, error: 'Perfil de especialista no encontrado.' });
          return;
        }
      }

      // 1. Obtener la cita actual y validar pertenencia
      const aptCheck = await getAppointmentForModification(appointmentId, psicologoId);
      if (aptCheck.error) {
        res.status(aptCheck.status || 400).json({ success: false, error: aptCheck.error });
        return;
      }

      const currentApt = aptCheck.appointment!;
      const targetPsicoId = currentApt.psicologo_id;
      const durationMinutes = Number(duracion) || Number(currentApt.duracion) || 60;
      const modalityClean = modalidad === 'online' ? 'online' : 'presencial';
      const cleanNotes = observaciones !== undefined ? String(observaciones).trim() : currentApt.observaciones;
      const startDateTimeStr = `${fecha} ${hora}`;

      // 2. Verificar restricciones de suplencia si es titular o suplente
      const restrictionError = await checkRescheduleRestrictions(targetPsicoId, currentApt.paciente_id, fecha);
      if (restrictionError) {
        res.status(400).json({ success: false, error: restrictionError });
        return;
      }

      // 3. Verificar que no choque con otra cita del mismo psicólogo en ese horario (excluyendo esta misma cita)
      const conflict = await hasScheduleConflict(targetPsicoId, appointmentId, startDateTimeStr, durationMinutes);
      if (conflict) {
        res.status(409).json({ success: false, error: 'El horario seleccionado se cruza con otra cita ya agendada.' });
        return;
      }

      // 4. Actualizar la cita
      await pool.query(
        `UPDATE citas_sesiones SET
           fecha_hora_inicio = STR_TO_DATE(?, '%Y-%m-%d %H:%i'),
           fecha_hora_fin = DATE_ADD(STR_TO_DATE(?, '%Y-%m-%d %H:%i'), INTERVAL ? MINUTE),
           modalidad = ?,
           observaciones = ?
         WHERE id = ?`,
        [startDateTimeStr, startDateTimeStr, durationMinutes, modalityClean, cleanNotes, appointmentId]
      );

      res.json({
        success: true,
        message: 'Sesión actualizada exitosamente.',
        data: {
          id: String(appointmentId),
          fecha,
          hora,
          duracion: String(durationMinutes),
          modalidad: modalityClean,
          observaciones: cleanNotes,
        },
      });
    } catch (error) {
      console.error('Error en PUT /api/appointments/:id:', error);
      res.status(500).json({ success: false, error: 'Error al actualizar la cita clínica.' });
    }
  }
);

/**
 * DELETE /api/appointments/:id
 * Permite al especialista eliminar o cancelar una sesión programada.
 */
appointmentRouter.delete(
  '/:id',
  requireRole('psicologo', 'admin'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const appointmentId = Number(req.params.id);
      if (!appointmentId) {
        res.status(400).json({ success: false, error: 'ID de cita inválido.' });
        return;
      }

      let psicologoId: number | null = null;
      if (req.user!.role === 'psicologo') {
        psicologoId = await getPsicologoIdByUserId(req.user!.userId);
        if (!psicologoId) {
          res.status(403).json({ success: false, error: 'Perfil de especialista no encontrado.' });
          return;
        }
      }

      // 1. Obtener la cita actual y validar pertenencia
      let checkSql = 'SELECT * FROM citas_sesiones WHERE id = ? LIMIT 1';
      const checkParams: any[] = [appointmentId];
      if (psicologoId) {
        checkSql = 'SELECT * FROM citas_sesiones WHERE id = ? AND psicologo_id = ? LIMIT 1';
        checkParams.push(psicologoId);
      }

      const [existingRows] = await pool.query<RowDataPacket[]>(checkSql, checkParams);
      if (existingRows.length === 0) {
        res.status(404).json({ success: false, error: 'Cita no encontrada o no tienes permiso para eliminarla.' });
        return;
      }

      const currentApt = existingRows[0];
      if (currentApt.estado !== 'programada') {
        res.status(400).json({ success: false, error: 'Solo se pueden cancelar sesiones que se encuentren en estado programada.' });
        return;
      }

      // 2. Eliminar la cita de la base de datos
      await pool.query('DELETE FROM citas_sesiones WHERE id = ?', [appointmentId]);

      res.json({
        success: true,
        message: 'Sesión cancelada y eliminada exitosamente.',
      });
    } catch (error) {
      console.error('Error en DELETE /api/appointments/:id:', error);
      res.status(500).json({ success: false, error: 'Error al cancelar la sesión clínica.' });
    }
  }
);
