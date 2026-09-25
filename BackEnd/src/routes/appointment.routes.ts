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
      let targetPsicologoId: number | null = null;
      if (req.user!.role === 'psicologo') {
        targetPsicologoId = await getPsicologoIdByUserId(req.user!.userId);
        if (!targetPsicologoId) {
          res.status(403).json({
            success: false,
            error: 'No se encontró un perfil de especialista asociado a tu cuenta.',
          });
          return;
        }
      } else {
        // Rol admin: asociar al primer especialista o asignado
        const [firstDoc] = await pool.query<RowDataPacket[]>(
          'SELECT id FROM psicologos LIMIT 1'
        );
        targetPsicologoId = firstDoc.length > 0 ? firstDoc[0].id : 1;
      }

      // 2. Anti-BOLA: Verificar que el paciente esté asignado a este especialista
      if (req.user!.role === 'psicologo') {
        const [relRows] = await pool.query<RowDataPacket[]>(
          'SELECT id FROM relacion_psicologo_paciente WHERE psicologo_id = ? AND paciente_id = ? LIMIT 1',
          [targetPsicologoId, paciente_id]
        );
        if (relRows.length === 0) {
          res.status(403).json({
            success: false,
            error: 'Acceso denegado: El paciente no se encuentra asignado a tu supervisión.',
          });
          return;
        }
      }

      const durationMinutes = Number(duracion) || 60;
      const modalityClean = modalidad === 'online' ? 'online' : 'presencial';
      const cleanNotes = (observaciones || '').trim();
      const startDateTimeStr = `${fecha} ${hora}`;

      // 3. Insertar sesión en `citas_sesiones`
      const [insertResult] = await pool.query<ResultSetHeader>(
        `INSERT INTO citas_sesiones 
          (psicologo_id, paciente_id, fecha_hora_inicio, fecha_hora_fin, modalidad, estado, observaciones)
         VALUES (
           ?, 
           ?, 
           STR_TO_DATE(?, '%Y-%m-%d %H:%i'), 
           DATE_ADD(STR_TO_DATE(?, '%Y-%m-%d %H:%i'), INTERVAL ? MINUTE), 
           ?, 
           IF(DATE_ADD(STR_TO_DATE(?, '%Y-%m-%d %H:%i'), INTERVAL ? MINUTE) < NOW(), 'completada', 'programada'), 
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

      // Obtener todas las sesiones de citas_sesiones
      let querySql = `
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
          DATE_FORMAT(cs.fecha_hora_inicio, '%Y-%m-%d %H:%i:%s') as fecha_hora_inicio
        FROM citas_sesiones cs
        WHERE cs.paciente_id = ?
      `;
      const params: any[] = [patientId];

      if (psicologoId) {
        querySql += ' AND cs.psicologo_id = ?';
        params.push(psicologoId);
      }

      querySql += ' ORDER BY cs.fecha_hora_inicio DESC';

      const [rows] = await pool.query<RowDataPacket[]>(querySql, params);

      res.json({
        success: true,
        data: rows.map((r) => ({
          id: String(r.id),
          fecha: r.fecha,
          hora: r.hora,
          horaFin: r.hora_fin,
          duracion: String(r.duracion || 60),
          modalidad: r.modalidad,
          estado: r.estado === 'completada' ? 'Completada' : 'Programada',
          observaciones: r.observaciones,
          motivo: r.observaciones, // Compatibilidad retroactiva
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
          COALESCE(cs.observaciones, '') as observaciones
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
          IF(cs.fecha_hora_inicio >= NOW() AND cs.estado != 'cancelada', 1, 0) as es_futura
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
          modalidad: row.modalidad === 'online' ? 'Online' : 'Presencial',
          estado: row.estado === 'completada' ? 'Completada' : 'Programada',
          observaciones: row.observaciones,
          doctorNombre: row.doctor_nombre,
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
