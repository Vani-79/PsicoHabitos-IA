import { Router, Request, Response } from 'express';
import { pool } from '../config/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { emailService } from '../services/emailService';

export const patientRouter = Router();

// GET /api/patients/recent?limit=5&doctorEmail=...
patientRouter.get('/recent', async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 5, 1), 50);
    const doctorEmail = typeof req.query.doctorEmail === 'string'
      ? req.query.doctorEmail.trim().toLowerCase() || null
      : null;
    const psicologoId = req.query.psicologoId ? Number(req.query.psicologoId) : null;

    let rows: RowDataPacket[] = [];

    if (doctorEmail) {
      // Filtrar pacientes vinculados exclusivamente a este psicólogo por email
      [rows] = await pool.query<RowDataPacket[]>(
        `SELECT 
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
        JOIN psicologos psi ON psi.id = r.psicologo_id
        JOIN usuarios u ON u.id = psi.usuario_id
        WHERE u.email = ?
        ORDER BY pac.created_at DESC 
        LIMIT ?`,
        [doctorEmail, limit]
      );
    } else if (psicologoId) {
      // Filtrar pacientes por ID de psicólogo
      [rows] = await pool.query<RowDataPacket[]>(
        `SELECT 
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
      // Si no se especifica psicólogo, consultar pacientes con su relación si existe
      [rows] = await pool.query<RowDataPacket[]>(
        `SELECT 
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

// GET /api/patients
patientRouter.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const doctorEmail = typeof req.query.doctorEmail === 'string'
      ? req.query.doctorEmail.trim().toLowerCase() || null
      : null;

    let rows: RowDataPacket[] = [];

    if (doctorEmail) {
      [rows] = await pool.query<RowDataPacket[]>(
        `SELECT 
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
        JOIN psicologos psi ON psi.id = r.psicologo_id
        JOIN usuarios u ON u.id = psi.usuario_id
        WHERE u.email = ?
        ORDER BY pac.created_at DESC`,
        [doctorEmail]
      );
    } else {
      [rows] = await pool.query<RowDataPacket[]>(
        `SELECT 
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

// POST /api/patients
patientRouter.post('/', async (req: Request, res: Response): Promise<void> => {
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
      doctorEmail,
      psicologo_id,
      created_at,
    } = req.body;

    if (!nombre || !apellido_paterno || !email) {
      res.status(400).json({ success: false, error: 'Faltan campos obligatorios' });
      return;
    }

    const targetEmail = String(email).trim().toLowerCase();

    // 1. Validar que el correo no pertenezca a un usuario existente (psicólogo u otro paciente)
    const [existingUsers] = await pool.query<RowDataPacket[]>(
      'SELECT id, rol FROM usuarios WHERE email = ? LIMIT 1',
      [targetEmail]
    );

    if (existingUsers.length > 0) {
      const rolEncontrado = existingUsers[0].rol === 'psicologo' ? 'un especialista / psicólogo' : 'un paciente';
      res.status(409).json({
        success: false,
        error: `El correo "${targetEmail}" ya se encuentra registrado en el sistema como ${rolEncontrado}. Por favor utiliza un correo diferente.`,
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

    // 3. Vincular con el especialista autenticado o indicado
    let doctor: RowDataPacket | undefined;
    if (doctorEmail) {
      const [byEmail] = await pool.query<RowDataPacket[]>(
        `SELECT psi.id, psi.nombre, psi.apellidos 
         FROM psicologos psi 
         JOIN usuarios u ON u.id = psi.usuario_id 
         WHERE u.email = ? LIMIT 1`,
        [String(doctorEmail).trim().toLowerCase()]
      );
      doctor = byEmail[0];
    }

    if (!doctor && psicologo_id) {
      const [byId] = await pool.query<RowDataPacket[]>(
        'SELECT id, nombre, apellidos FROM psicologos WHERE id = ? LIMIT 1',
        [Number(psicologo_id)]
      );
      doctor = byId[0];
    }

    if (!doctor) {
      const [fallbackDoc] = await pool.query<RowDataPacket[]>(
        'SELECT id, nombre, apellidos FROM psicologos LIMIT 1'
      );
      doctor = fallbackDoc[0];
    }

    const targetPsicologoId = doctor ? doctor.id : 1;
    const doctorName = doctor ? `Ps. ${doctor.nombre} ${doctor.apellidos}` : 'tu especialista';

    if (pacienteId && fecha_primera_sesion) {
      await pool.query(
        `INSERT INTO relacion_psicologo_paciente 
          (psicologo_id, paciente_id, fecha_primera_sesion, estado) 
         VALUES (?, ?, ?, 'activo') 
         ON DUPLICATE KEY UPDATE fecha_primera_sesion = VALUES(fecha_primera_sesion)`,
        [targetPsicologoId, pacienteId, fecha_primera_sesion]
      );
    }

    // 4. Enviar correo de confirmación de registro y bienvenida al paciente
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
    res.status(500).json({ success: false, error: 'Error al registrar paciente en MySQL' });
  }
});
