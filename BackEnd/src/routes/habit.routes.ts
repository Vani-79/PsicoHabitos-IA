import { Router, Request, Response } from 'express';
import { pool } from '../config/db';
import { RowDataPacket } from 'mysql2';

export const habitRouter = Router();

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
 * GET /api/habits/today-status?userId=...
 * Consulta robusta en la base de datos (usando CURDATE() del servidor MySQL)
 * para verificar si el paciente ya completó su registro de hábitos hoy.
 */
habitRouter.get('/today-status', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = typeof req.query.userId === 'string' ? req.query.userId.trim() : '';

    if (!userId) {
      res.status(400).json({ success: false, error: 'Parámetro userId requerido' });
      return;
    }

    const pacienteId = await resolvePacienteId(userId);

    if (!pacienteId) {
      // Si no existe el paciente en DB, responder no bloqueado
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
      [pacienteId]
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

    // Obtener la fecha del servidor aunque no haya registro hoy
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
 * Si ya se completó el registro hoy, RECHAZA la solicitud para evitar manipulaciones.
 */
habitRouter.post('/checkin', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      user_id,
      comida,
      ejercicio,
      hidratacion,
      ansiedad,
      sueno,
      sueno_horas,
      estres,
    } = req.body;

    if (!user_id) {
      res.status(400).json({ success: false, error: 'user_id es obligatorio' });
      return;
    }

    const pacienteId = await resolvePacienteId(user_id);

    if (!pacienteId) {
      res.status(404).json({ success: false, error: 'Paciente no encontrado en el sistema' });
      return;
    }

    // 1. Verificación robusta en el servidor: ¿Ya completó el check-in hoy?
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
        Number(comida) || 3,
        Number(ejercicio) || 3,
        Number(hidratacion) || 2.0,
        Number(ansiedad) || 3,
        Number(sueno) || 3,
        sueno_horas ? Number(sueno_horas) : null,
        Number(estres) || 3,
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
    res.status(500).json({ success: false, error: 'Error al registrar check-in diario en MySQL' });
  }
});

/**
 * GET /api/habits/:userId
 * Obtiene el historial de registros de hábitos para un paciente específico.
 */
habitRouter.get('/:userId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const pacienteId = await resolvePacienteId(userId);

    if (!pacienteId) {
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
      [pacienteId]
    );

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error en GET /api/habits/:userId:', error);
    res.status(500).json({ success: false, error: 'Error al consultar historial de hábitos' });
  }
});
