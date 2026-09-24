import { Router, Request, Response } from 'express';
import { pool } from '../config/db';
import { RowDataPacket } from 'mysql2';
import { authMiddleware, requireRole, requireActiveSubscription } from '../middlewares/authMiddleware';

export const habitRouter = Router();

// Blindaje global: Todas las rutas de hábitos clínicos requieren autenticación JWT
habitRouter.use(authMiddleware);
// Si quien consulta hábitos es un psicólogo, exige suscripción activa y vigente
habitRouter.use(requireActiveSubscription);

/**
 * Resuelve el paciente_id a partir de email, ID numérico o nombre.
 */
async function resolvePacienteId(identifier: string | number | string[]): Promise<number | null> {
  const cleanId = Array.isArray(identifier) ? String(identifier[0] || '').trim() : String(identifier || '').trim();
  const numId = Array.isArray(identifier) ? Number(identifier[0]) || 0 : Number(identifier) || 0;

  const [pacienteRows] = await pool.query<RowDataPacket[]>(
    `SELECT p.id 
     FROM pacientes p
     LEFT JOIN usuarios u ON u.id = p.usuario_id
     WHERE p.email = ? OR u.email = ? OR p.id = ? OR p.nombre = ?
     LIMIT 1`,
    [cleanId, cleanId, numId, cleanId]
  );

  if (pacienteRows.length > 0) {
    return pacienteRows[0].id;
  }
  return null;
}


/**
 * Obtiene el paciente_id asociado a un usuario autenticado con rol paciente.
 */
async function getPacienteIdFromUser(userId: number, email: string): Promise<number | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT id FROM pacientes WHERE usuario_id = ? OR LOWER(email) = ? LIMIT 1',
    [userId, email.toLowerCase()]
  );
  return rows.length > 0 ? rows[0].id : null;
}

/**
 * Verifica si un paciente está formalmente asignado a un psicólogo autenticado.
 */
async function isPatientAssignedToPsychologist(psychologistUserId: number, pacienteId: number): Promise<boolean> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT r.id 
     FROM relacion_psicologo_paciente r
     JOIN psicologos psi ON psi.id = r.psicologo_id
     WHERE psi.usuario_id = ? AND r.paciente_id = ?
     LIMIT 1`,
    [psychologistUserId, pacienteId]
  );
  return rows.length > 0;
}

/**
 * GET /api/habits/today-status?userId=...
 * Consulta robusta en la base de datos (usando CURDATE() del servidor MySQL)
 * con validación estricta de propiedad clínica (Anti-BOLA).
 */
habitRouter.get('/today-status', async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    let targetPacienteId: number | null = null;

    if (user.role === 'paciente') {
      targetPacienteId = await getPacienteIdFromUser(user.userId, user.email);
    } else {
      // Si es especialista o admin, requiere el parámetro userId
      const queryUserId = typeof req.query.userId === 'string' ? req.query.userId.trim() : '';
      if (!queryUserId) {
        res.status(400).json({ success: false, error: 'Parámetro userId requerido para consultar hábitos del paciente' });
        return;
      }
      targetPacienteId = await resolvePacienteId(queryUserId);

      // Verificación Anti-BOLA para psicólogos
      if (user.role === 'psicologo' && targetPacienteId) {
        const isAssigned = await isPatientAssignedToPsychologist(user.userId, targetPacienteId);
        if (!isAssigned) {
          res.status(403).json({
            success: false,
            error: 'Acceso denegado: El paciente no se encuentra asignado a tu supervisión clínica.',
          });
          return;
        }
      }
    }

    if (!targetPacienteId) {
      res.json({
        success: true,
        completedToday: false,
        isLocked: false,
        serverDate: new Date().toISOString().split('T')[0],
        record: null,
      });
      return;
    }

    // Consulta con fecha del servidor MySQL (CURDATE())
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT 
        h.id,
        h.paciente_id,
        DATE_FORMAT(h.evaluation_date, '%Y-%m-%d') as evaluation_date,
        h.comida,
        h.ejercicio,
        h.hidratacion,
        h.ansiedad,
        h.sueno,
        h.sueno_horas,
        h.estres,
        DATE_FORMAT(h.confirmed_at, '%Y-%m-%d %H:%i:%s') as confirmed_at,
        DATE_FORMAT(CURDATE(), '%Y-%m-%d') as server_date,
        DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL 1 DAY), '%Y-%m-%d') as next_date
      FROM habitos_diarios h
      WHERE h.paciente_id = ? AND h.evaluation_date = CURDATE()
      LIMIT 1`,
      [targetPacienteId]
    );

    if (rows.length > 0) {
      const row = rows[0];
      res.json({
        success: true,
        completedToday: true,
        isLocked: true,
        serverDate: row.server_date,
        nextDate: row.next_date,
        message: 'Registro de hábitos ya completado para hoy.',
        record: {
          comida: row.comida,
          ejercicio: row.ejercicio,
          hidratacion: Number(row.hidratacion),
          ansiedad: row.ansiedad,
          sueno: row.sueno,
          sueno_horas: row.sueno_horas ? Number(row.sueno_horas) : null,
          estres: row.estres,
          confirmed_at: row.confirmed_at,
          evaluation_date: row.evaluation_date,
        },
      });
      return;
    }

    const [dateRows] = await pool.query<RowDataPacket[]>(
      "SELECT DATE_FORMAT(CURDATE(), '%Y-%m-%d') as server_date, DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL 1 DAY), '%Y-%m-%d') as next_date"
    );

    res.json({
      success: true,
      completedToday: false,
      isLocked: false,
      serverDate: dateRows[0]?.server_date || new Date().toISOString().split('T')[0],
      nextDate: dateRows[0]?.next_date,
      record: null,
    });
  } catch (error) {
    console.error('Error en GET /api/habits/today-status:', error);
    res.status(500).json({ success: false, error: 'Error al consultar estado de hábitos de hoy' });
  }
});

/**
 * POST /api/habits/checkin
 * Registra los hábitos del día utilizando la fecha del servidor (CURDATE()).
 * El paciente solo puede registrar para sí mismo (identidad extraída del JWT verificado).
 */
habitRouter.post('/checkin', requireRole('paciente'), async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const pacienteId = await getPacienteIdFromUser(user.userId, user.email);

    if (!pacienteId) {
      res.status(404).json({ success: false, error: 'No se encontró la ficha clínica del paciente en el sistema.' });
      return;
    }

    const {
      comida,
      ejercicio,
      hidratacion,
      ansiedad,
      sueno,
      sueno_horas,
      estres,
    } = req.body;

    // 1. Verificación en el servidor: ¿Ya completó el check-in hoy?
    const [existingToday] = await pool.query<RowDataPacket[]>(
      'SELECT id, DATE_FORMAT(confirmed_at, "%Y-%m-%d %H:%i:%s") as confirmed_at FROM habitos_diarios WHERE paciente_id = ? AND evaluation_date = CURDATE() LIMIT 1',
      [pacienteId]
    );

    if (existingToday.length > 0) {
      res.status(409).json({
        success: false,
        error: 'Ya has completado tu registro de hábitos para el día de hoy. Tu próxima evaluación estará habilitada mañana.',
        isLocked: true,
        confirmed_at: existingToday[0].confirmed_at,
      });
      return;
    }

    // 2. Inserción con fecha y hora del servidor MySQL (CURDATE() y NOW())
    await pool.query(
      `INSERT INTO habitos_diarios 
        (paciente_id, evaluation_date, comida, ejercicio, hidratacion, ansiedad, sueno, sueno_horas, estres, confirmed_at)
       VALUES (?, CURDATE(), ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        pacienteId,
        Math.min(Math.max(Number(comida) || 3, 1), 5),
        Math.min(Math.max(Number(ejercicio) || 3, 1), 5),
        Math.max(Number(hidratacion) || 2.0, 0),
        Math.min(Math.max(Number(ansiedad) || 3, 1), 5),
        Math.min(Math.max(Number(sueno) || 3, 1), 5),
        sueno_horas ? Math.max(Number(sueno_horas), 0) : null,
        Math.min(Math.max(Number(estres) || 3, 1), 5),
      ]
    );

    // Obtener la fecha del servidor asignada
    const [dateRows] = await pool.query<RowDataPacket[]>(
      "SELECT DATE_FORMAT(CURDATE(), '%Y-%m-%d') as server_date, DATE_FORMAT(NOW(), '%Y-%m-%d %H:%i:%s') as confirmed_at"
    );

    res.status(201).json({
      success: true,
      message: 'Check-in diario registrado exitosamente.',
      data: {
        ...req.body,
        evaluation_date: dateRows[0]?.server_date,
        confirmed_at: dateRows[0]?.confirmed_at,
      },
      isLocked: true,
    });
  } catch (error) {
    console.error('Error en POST /api/habits/checkin:', error);
    res.status(500).json({ success: false, error: 'Error al registrar check-in diario' });
  }
});

/**
 * GET /api/habits/:userId
 * Obtiene el historial de registros de hábitos con verificación estricta de propiedad (Anti-BOLA).
 */
habitRouter.get('/:userId', async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { userId } = req.params;
    let targetPacienteId: number | null = null;

    if (user.role === 'paciente') {
      // Paciente solo puede ver su propio historial
      targetPacienteId = await getPacienteIdFromUser(user.userId, user.email);
    } else {
      // Especialista o admin
      targetPacienteId = await resolvePacienteId(userId);

      if (user.role === 'psicologo' && targetPacienteId) {
        const isAssigned = await isPatientAssignedToPsychologist(user.userId, targetPacienteId);
        if (!isAssigned) {
          res.status(403).json({
            success: false,
            error: 'Acceso denegado: El paciente no se encuentra asignado a tu supervisión clínica.',
          });
          return;
        }
      }
    }

    if (!targetPacienteId) {
      res.json({ success: true, data: [] });
      return;
    }

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT 
        h.id,
        p.email as user_id,
        DATE_FORMAT(h.evaluation_date, '%Y-%m-%d') as evaluation_date,
        h.comida,
        h.ejercicio,
        h.hidratacion,
        h.ansiedad,
        h.sueno,
        h.sueno_horas,
        h.estres,
        DATE_FORMAT(h.confirmed_at, '%Y-%m-%d %H:%i:%s') as confirmed_at
      FROM habitos_diarios h
      JOIN pacientes p ON p.id = h.paciente_id
      WHERE h.paciente_id = ?
      ORDER BY h.evaluation_date DESC`,
      [targetPacienteId]
    );

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error en GET /api/habits/:userId:', error);
    res.status(500).json({ success: false, error: 'Error al consultar historial de hábitos' });
  }
});
