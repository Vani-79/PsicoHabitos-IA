import { Router, Request, Response } from 'express';
import { pool } from '../config/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { emailService } from '../services/emailService';
import { authMiddleware, requireRole, requireActiveSubscription } from '../middlewares/authMiddleware';
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
          DATE_FORMAT(pac.created_at, '%Y-%m-%d %H:%i:%s') as created_at 
        FROM pacientes pac
        JOIN relacion_psicologo_paciente r ON pac.id = r.paciente_id
        WHERE r.psicologo_id = ?
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
          DATE_FORMAT(pac.created_at, '%Y-%m-%d %H:%i:%s') as created_at 
        FROM pacientes pac
        LEFT JOIN relacion_psicologo_paciente r ON pac.id = r.paciente_id
        ORDER BY pac.created_at DESC 
        LIMIT ?`,
        [limit]
      );
    }

    res.json({ success: true, data: rows });
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
          COALESCE(cs.fecha_hora_inicio, r.fecha_primera_sesion) as fecha_orden
        FROM pacientes pac
        JOIN relacion_psicologo_paciente r ON pac.id = r.paciente_id
        LEFT JOIN citas_sesiones cs ON cs.paciente_id = pac.id 
          AND cs.psicologo_id = r.psicologo_id 
          AND DATE(cs.fecha_hora_inicio) = CURDATE()
          AND cs.estado != 'cancelada'
        WHERE r.psicologo_id = ?
          AND (
            r.fecha_primera_sesion = CURDATE()
            OR DATE(cs.fecha_hora_inicio) = CURDATE()
          )
        ORDER BY fecha_orden ASC`,
        [psicologoId]
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
          COALESCE(cs.fecha_hora_inicio, r.fecha_primera_sesion) as fecha_orden
        FROM pacientes pac
        LEFT JOIN relacion_psicologo_paciente r ON pac.id = r.paciente_id
        LEFT JOIN citas_sesiones cs ON cs.paciente_id = pac.id 
          AND DATE(cs.fecha_hora_inicio) = CURDATE()
          AND cs.estado != 'cancelada'
        WHERE (
          r.fecha_primera_sesion = CURDATE()
          OR DATE(cs.fecha_hora_inicio) = CURDATE()
        )
        ORDER BY fecha_orden ASC`
      );
    }

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error en GET /api/patients/today:', error);
    res.status(500).json({ success: false, error: 'Error al consultar pacientes del día' });
  }
});

/**
 * GET /api/patients/profile?email=...&name=...
 * Consulta la ficha clínica con validación estricta de propiedad (Ownership Check / Anti-BOLA):
 * - Paciente: solo puede consultar su propia ficha.
 * - Psicólogo: solo puede consultar pacientes que tenga formalmente asignados.
 */
patientRouter.get('/profile', async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    let targetEmail = typeof req.query.email === 'string' ? req.query.email.trim().toLowerCase() : '';
    const targetName = typeof req.query.name === 'string' ? req.query.name.trim() : '';

    // Si el llamante es un paciente, forzar que consulte exclusivamente su propio perfil
    if (user.role === 'paciente') {
      targetEmail = user.email.toLowerCase();
    }

    const identifier = targetEmail || targetName;

    if (!identifier && user.role !== 'paciente') {
      res.status(400).json({ success: false, error: 'Se requiere el correo o identificador del paciente' });
      return;
    }

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
        psi.apellidos as doctor_apellidos
      FROM pacientes pac
      LEFT JOIN usuarios u ON u.id = pac.usuario_id
      LEFT JOIN relacion_psicologo_paciente r ON pac.id = r.paciente_id
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

    if (rows.length === 0) {
      res.status(404).json({ success: false, error: 'Paciente no encontrado en el sistema' });
      return;
    }

    const p = rows[0];

    // Anti-BOLA: Si es psicólogo, comprobar que el paciente esté asignado a su supervisión
    if (user.role === 'psicologo') {
      const psicologoId = await getPsicologoIdByUserId(user.userId);
      if (!psicologoId || p.psicologo_id !== psicologoId) {
        res.status(403).json({
          success: false,
          error: 'Acceso denegado: Este paciente no se encuentra asignado a tu supervisión clínica.',
        });
        return;
      }
    }

    const especialista = p.doctor_nombre
      ? `Ps. ${p.doctor_nombre} ${p.doctor_apellidos}`
      : 'Sin especialista asignado';

    const targetUserId = p.usuario_id || user.userId;
    const availableRoles = await getUserAvailableRoles(targetUserId);

    res.json({
      success: true,
      data: {
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
        availableRoles,
        hasMultipleRoles: availableRoles.length > 1,
      },
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
          DATE_FORMAT(pac.created_at, '%Y-%m-%d %H:%i:%s') as created_at 
        FROM pacientes pac
        JOIN relacion_psicologo_paciente r ON pac.id = r.paciente_id
        WHERE r.psicologo_id = ?
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
          DATE_FORMAT(pac.created_at, '%Y-%m-%d %H:%i:%s') as created_at 
        FROM pacientes pac
        LEFT JOIN relacion_psicologo_paciente r ON pac.id = r.paciente_id
        ORDER BY pac.created_at DESC`
      );
    }

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error en GET /api/patients:', error);
    res.status(500).json({ success: false, error: 'Error al listar pacientes' });
  }
});

/**
 * POST /api/patients
 * Registra un nuevo paciente vinculándolo automáticamente al especialista autenticado.
 */
patientRouter.post('/', requireRole('psicologo', 'admin'), requireActiveSubscription, async (req: Request, res: Response): Promise<void> => {
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
    if (req.user && req.user.email.toLowerCase() === targetEmail) {
      res.status(400).json({
        success: false,
        error: 'No puedes registrarte a ti mismo como tu propio paciente. Por razones éticas y de supervisión clínica, debes ser registrado por otro especialista.',
      });
      return;
    }

    // 2. Determinar el especialista autenticado para la relación clínica
    let targetPsicologoId: number | null = null;
    let doctorName = 'tu especialista';

    if (req.user!.role === 'psicologo') {
      const [psiRows] = await pool.query<RowDataPacket[]>(
        'SELECT id, usuario_id, nombre, apellidos FROM psicologos WHERE usuario_id = ? LIMIT 1',
        [req.user!.userId]
      );
      if (psiRows.length > 0) {
        targetPsicologoId = psiRows[0].id;
        doctorName = `Ps. ${psiRows[0].nombre} ${psiRows[0].apellidos}`;
      }
    }

    if (!targetPsicologoId) {
      const [firstDoc] = await pool.query<RowDataPacket[]>('SELECT id, nombre, apellidos FROM psicologos LIMIT 1');
      if (firstDoc.length > 0) {
        targetPsicologoId = firstDoc[0].id;
        doctorName = `Ps. ${firstDoc[0].nombre} ${firstDoc[0].apellidos}`;
      } else {
        targetPsicologoId = 1;
      }
    }

    // 3. Verificar si el paciente ya tiene ficha clínica registrada
    const [existingPatients] = await pool.query<RowDataPacket[]>(
      'SELECT id, usuario_id, nombre, apellido_paterno FROM pacientes WHERE email = ? LIMIT 1',
      [targetEmail]
    );

    let pacienteId: number;

    if (existingPatients.length > 0) {
      pacienteId = existingPatients[0].id;

      // Verificar si ya tiene relación con ESTE especialista
      const [existingRel] = await pool.query<RowDataPacket[]>(
        'SELECT id FROM relacion_psicologo_paciente WHERE psicologo_id = ? AND paciente_id = ? LIMIT 1',
        [targetPsicologoId, pacienteId]
      );

      if (existingRel.length > 0) {
        res.status(409).json({
          success: false,
          error: `Ya tienes asignado a este paciente en tu lista clínica.`,
        });
        return;
      }

      // Si ya existía como paciente de otro especialista, agregar relación con este especialista
      await pool.query(
        `INSERT INTO relacion_psicologo_paciente 
          (psicologo_id, paciente_id, fecha_primera_sesion, estado) 
         VALUES (?, ?, COALESCE(?, CURDATE()), 'activo')`,
        [targetPsicologoId, pacienteId, fecha_primera_sesion || null]
      );

      // Registrar primera sesión en citas_sesiones
      const existingSessionDate = fecha_primera_sesion || new Date().toISOString().split('T')[0];
      const existingSessionTime = (hora_primera_sesion || '10:00').trim();
      const existingDurationMinutes = Number(duracion_primera_sesion) || 60;
      const existingSessionModality = modalidad_primera_sesion === 'online' ? 'online' : 'presencial';
      const existingSessionNotes = (observaciones_primera_sesion || 'Primera sesión de apertura de ficha clínica').trim();

      await pool.query(
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
          pacienteId,
          `${existingSessionDate} ${existingSessionTime}`,
          `${existingSessionDate} ${existingSessionTime}`,
          existingDurationMinutes,
          existingSessionModality,
          `${existingSessionDate} ${existingSessionTime}`,
          existingDurationMinutes,
          existingSessionNotes,
        ]
      );

      res.status(201).json({
        success: true,
        message: 'Paciente asignado correctamente a tu lista de pacientes.',
        data: {
          id: pacienteId,
          nombre: existingPatients[0].nombre,
          apellido_paterno: existingPatients[0].apellido_paterno,
          email: targetEmail,
          fecha_primera_sesion,
        },
      });
      return;
    }

    // 4. Determinar o crear cuenta en tabla `usuarios`
    const [existingUsers] = await pool.query<RowDataPacket[]>(
      'SELECT id, rol FROM usuarios WHERE email = ? LIMIT 1',
      [targetEmail]
    );

    let usuarioId: number;

    if (existingUsers.length > 0) {
      // El usuario ya existe (ej: es un colega psicólogo). Habilitar rol múltiple 'ambos'
      usuarioId = existingUsers[0].id;
      await pool.query("UPDATE usuarios SET rol = 'ambos' WHERE id = ?", [usuarioId]);
    } else {
      // Crear cuenta nueva de paciente
      const [userResult] = await pool.query<ResultSetHeader>(
        `INSERT INTO usuarios (email, password_hash, rol, activo, debe_crear_password) 
         VALUES (?, NULL, 'paciente', TRUE, TRUE)`,
        [targetEmail]
      );
      usuarioId = userResult.insertId;
    }

    // 5. Determinar edad exacta al registrar a partir de la fecha de nacimiento
    let finalEdad = Number(edad) || 0;
    if (fecha_nacimiento) {
      const birth = new Date(fecha_nacimiento);
      if (!isNaN(birth.getTime())) {
        const today = new Date();
        let calc = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
          calc--;
        }
        if (calc >= 0) finalEdad = calc;
      }
    }

    // Insertar ficha clínica en tabla `pacientes`
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO pacientes 
        (usuario_id, nombre, apellido_paterno, apellido_materno, edad, fecha_nacimiento, genero, email, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, NOW()))`,
      [
        usuarioId,
        nombre.trim(),
        apellido_paterno.trim(),
        (apellido_materno || '').trim(),
        finalEdad,
        fecha_nacimiento,
        genero,
        targetEmail,
        created_at || null,
      ]
    );

    pacienteId = result.insertId;

    // 6. Vincular relación psicólogo - paciente
    await pool.query(
      `INSERT INTO relacion_psicologo_paciente 
        (psicologo_id, paciente_id, fecha_primera_sesion, estado) 
       VALUES (?, ?, COALESCE(?, CURDATE()), 'activo') 
       ON DUPLICATE KEY UPDATE fecha_primera_sesion = VALUES(fecha_primera_sesion)`,
      [targetPsicologoId, pacienteId, fecha_primera_sesion || null]
    );

    // 6.b Registrar la primera sesión en citas_sesiones con su hora, duración, modalidad y observaciones
    const firstSessionDate = fecha_primera_sesion || new Date().toISOString().split('T')[0];
    const firstSessionTime = (hora_primera_sesion || '10:00').trim();
    const firstDurationMinutes = Number(duracion_primera_sesion) || 60;
    const firstSessionModality = modalidad_primera_sesion === 'online' ? 'online' : 'presencial';
    const firstSessionNotes = (observaciones_primera_sesion || 'Primera sesión de apertura de ficha clínica').trim();

    await pool.query(
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
        pacienteId,
        `${firstSessionDate} ${firstSessionTime}`,
        `${firstSessionDate} ${firstSessionTime}`,
        firstDurationMinutes,
        firstSessionModality,
        `${firstSessionDate} ${firstSessionTime}`,
        firstDurationMinutes,
        firstSessionNotes,
      ]
    );

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
});
