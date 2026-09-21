import { Router, Request, Response } from 'express';
import { pool } from '../config/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { emailService } from '../services/emailService';
import { authMiddleware, requireRole } from '../middlewares/authMiddleware';

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
          pac.edad, 
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
          pac.edad, 
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
        pac.edad, 
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
          pac.edad, 
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
          pac.edad, 
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
patientRouter.post('/', requireRole('psicologo', 'admin'), async (req: Request, res: Response): Promise<void> => {
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
    } = req.body;

    if (!nombre || !apellido_paterno || !email) {
      res.status(400).json({ success: false, error: 'Faltan campos obligatorios (nombre, apellido_paterno, email)' });
      return;
    }

    const targetEmail = String(email).trim().toLowerCase();

    // 1. Validar que el correo no pertenezca a un usuario existente
    const [existingUsers] = await pool.query<RowDataPacket[]>(
      'SELECT id, rol FROM usuarios WHERE email = ? LIMIT 1',
      [targetEmail]
    );

    if (existingUsers.length > 0) {
      const rolEncontrado = existingUsers[0].rol === 'psicologo' ? 'un especialista' : 'un paciente';
      res.status(409).json({
        success: false,
        error: `El correo "${targetEmail}" ya se encuentra registrado como ${rolEncontrado}.`,
      });
      return;
    }

    const [existingPatients] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM pacientes WHERE email = ? LIMIT 1',
      [targetEmail]
    );

    if (existingPatients.length > 0) {
      res.status(409).json({
        success: false,
        error: `Ya existe una ficha clínica registrada para el correo "${targetEmail}".`,
      });
      return;
    }

    // 2. Crear cuenta en tabla `usuarios` con rol 'paciente' y debe_crear_password = TRUE
    const [userResult] = await pool.query<ResultSetHeader>(
      `INSERT INTO usuarios (email, password_hash, rol, activo, debe_crear_password) 
       VALUES (?, NULL, 'paciente', TRUE, TRUE)`,
      [targetEmail]
    );
    const usuarioId = userResult.insertId;

    // 3. Insertar ficha clínica en tabla `pacientes` asociando usuario_id
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO pacientes 
        (usuario_id, nombre, apellido_paterno, apellido_materno, edad, fecha_nacimiento, genero, email, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, NOW()))`,
      [
        usuarioId,
        nombre.trim(),
        apellido_paterno.trim(),
        (apellido_materno || '').trim(),
        Number(edad) || 0,
        fecha_nacimiento,
        genero,
        targetEmail,
        created_at || null,
      ]
    );

    const pacienteId = result.insertId;

    // 4. Determinar el especialista autenticado para la relación clínica
    let targetPsicologoId: number | null = null;
    let doctorName = 'tu especialista';

    if (req.user!.role === 'psicologo') {
      const [psiRows] = await pool.query<RowDataPacket[]>(
        'SELECT id, nombre, apellidos FROM psicologos WHERE usuario_id = ? LIMIT 1',
        [req.user!.userId]
      );
      if (psiRows.length > 0) {
        targetPsicologoId = psiRows[0].id;
        doctorName = `Ps. ${psiRows[0].nombre} ${psiRows[0].apellidos}`;
      }
    }

    // Si es admin o fallback
    if (!targetPsicologoId) {
      const [firstDoc] = await pool.query<RowDataPacket[]>('SELECT id, nombre, apellidos FROM psicologos LIMIT 1');
      if (firstDoc.length > 0) {
        targetPsicologoId = firstDoc[0].id;
        doctorName = `Ps. ${firstDoc[0].nombre} ${firstDoc[0].apellidos}`;
      } else {
        targetPsicologoId = 1;
      }
    }

    if (pacienteId && fecha_primera_sesion) {
      await pool.query(
        `INSERT INTO relacion_psicologo_paciente 
          (psicologo_id, paciente_id, fecha_primera_sesion, estado) 
         VALUES (?, ?, ?, 'activo') 
         ON DUPLICATE KEY UPDATE fecha_primera_sesion = VALUES(fecha_primera_sesion)`,
        [targetPsicologoId, pacienteId, fecha_primera_sesion]
      );
    }

    // 5. Enviar correo de bienvenida al paciente
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
        edad: Number(edad),
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
