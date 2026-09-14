import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../config/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { emailService } from '../services/emailService';

export const authRouter = Router();

/**
 * Valida que una contraseña cumpla con los requisitos de seguridad:
 * - Mínimo 8 caracteres
 * - Al menos una letra mayúscula
 * - Al menos una letra minúscula
 * - Al menos un número
 * - Al menos un carácter especial
 */
export function validatePasswordComplexity(password: string): { isValid: boolean; error?: string } {
  const clean = password.trim();
  if (clean.length < 8) {
    return { isValid: false, error: 'La contraseña debe tener al menos 8 caracteres.' };
  }
  if (!/[A-Z]/.test(clean)) {
    return { isValid: false, error: 'La contraseña debe contener al menos una letra mayúscula.' };
  }
  if (!/[a-z]/.test(clean)) {
    return { isValid: false, error: 'La contraseña debe contener al menos una letra minúscula.' };
  }
  if (!/\d/.test(clean)) {
    return { isValid: false, error: 'La contraseña debe contener al menos un número.' };
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(clean)) {
    return { isValid: false, error: 'La contraseña debe contener al menos un carácter especial (ej. @, #, $, !).' };
  }
  return { isValid: true };
}

/**
 * Obtiene el nombre formateado de un usuario según su rol.
 */
async function getUserDisplayName(usuarioId: number, rol: string, email: string): Promise<string> {
  try {
    if (rol === 'psicologo') {
      const [psicoRows] = await pool.query<RowDataPacket[]>(
        'SELECT nombre, apellidos FROM psicologos WHERE usuario_id = ? LIMIT 1',
        [usuarioId]
      );
      if (psicoRows.length > 0) {
        return `Ps. ${psicoRows[0].nombre} ${psicoRows[0].apellidos}`;
      }
    } else if (rol === 'paciente') {
      const [pacRows] = await pool.query<RowDataPacket[]>(
        'SELECT nombre, apellido_paterno FROM pacientes WHERE usuario_id = ? LIMIT 1',
        [usuarioId]
      );
      if (pacRows.length > 0) {
        return `${pacRows[0].nombre} ${pacRows[0].apellido_paterno}`;
      }
    }
  } catch (err) {
    console.warn('[getUserDisplayName] Error consultando nombre:', err);
  }

  const fallback = email.split('@')[0];
  return fallback.charAt(0).toUpperCase() + fallback.slice(1);
}

/**
 * POST /api/auth/check-email
 * Comprueba si un correo está registrado y si requiere crear contraseña por primera vez.
 */
authRouter.post('/check-email', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ success: false, error: 'Email requerido' });
      return;
    }

    const targetEmail = String(email).trim().toLowerCase();

    // 1. Buscar en la tabla `usuarios`
    const [userRows] = await pool.query<RowDataPacket[]>(
      'SELECT id, email, password_hash, rol, activo, debe_crear_password FROM usuarios WHERE email = ? LIMIT 1',
      [targetEmail]
    );

    if (userRows.length > 0) {
      const user = userRows[0];
      const requiresPassword = Boolean(user.debe_crear_password || !user.password_hash);
      const name = await getUserDisplayName(user.id, user.rol, user.email);

      res.json({
        success: true,
        exists: true,
        requiresPasswordCreation: requiresPassword,
        role: user.rol,
        name,
      });
      return;
    }

    // 2. Si no está en usuarios, verificar si existe en pacientes
    const [pacRows] = await pool.query<RowDataPacket[]>(
      'SELECT id, nombre, apellido_paterno FROM pacientes WHERE email = ? LIMIT 1',
      [targetEmail]
    );

    if (pacRows.length > 0) {
      // Auto-vincular en usuarios como pendiente de contraseña
      const pac = pacRows[0];
      const [uResult] = await pool.query<ResultSetHeader>(
        "INSERT INTO usuarios (email, password_hash, rol, activo, debe_crear_password) VALUES (?, NULL, 'paciente', TRUE, TRUE)",
        [targetEmail]
      );
      await pool.query('UPDATE pacientes SET usuario_id = ? WHERE id = ?', [uResult.insertId, pac.id]);

      res.json({
        success: true,
        exists: true,
        requiresPasswordCreation: true,
        role: 'paciente',
        name: `${pac.nombre} ${pac.apellido_paterno}`,
      });
      return;
    }

    // No existe en el sistema
    res.json({
      success: true,
      exists: false,
      requiresPasswordCreation: false,
    });
  } catch (error) {
    console.error('Error en /api/auth/check-email:', error);
    res.status(500).json({ success: false, error: 'Error al verificar email' });
  }
});

/**
 * POST /api/auth/create-initial-password
 * Permite a un paciente o psicólogo recién registrado crear su contraseña por primera vez.
 */
authRouter.post('/create-initial-password', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, acceptedTerms } = req.body;

    if (!email) {
      res.status(400).json({ success: false, error: 'Email requerido' });
      return;
    }

    if (!acceptedTerms) {
      res.status(400).json({
        success: false,
        error: 'Debes aceptar los Términos y Condiciones y la Política de Privacidad (Ley N° 21.719) para continuar.',
      });
      return;
    }

    const targetEmail = String(email).trim().toLowerCase();
    const cleanPassword = String(password || '').trim();

    // Validar complejidad de contraseña
    const complexity = validatePasswordComplexity(cleanPassword);
    if (!complexity.isValid) {
      res.status(400).json({ success: false, error: complexity.error });
      return;
    }

    // 1. Buscar usuario en tabla usuarios
    let [userRows] = await pool.query<RowDataPacket[]>(
      'SELECT id, email, rol, debe_crear_password FROM usuarios WHERE email = ? LIMIT 1',
      [targetEmail]
    );

    let usuarioId: number;
    let rol: string;

    if (userRows.length === 0) {
      // Si existe en pacientes pero aún no en usuarios, crearlo
      const [pacRows] = await pool.query<RowDataPacket[]>(
        'SELECT id FROM pacientes WHERE email = ? LIMIT 1',
        [targetEmail]
      );

      if (pacRows.length === 0) {
        res.status(404).json({
          success: false,
          error: 'No se encontró un registro asociado a este correo en el sistema.',
        });
        return;
      }

      const passwordHash = bcrypt.hashSync(cleanPassword, 10);
      const [uResult] = await pool.query<ResultSetHeader>(
        "INSERT INTO usuarios (email, password_hash, rol, activo, debe_crear_password) VALUES (?, ?, 'paciente', TRUE, FALSE)",
        [targetEmail, passwordHash]
      );
      usuarioId = uResult.insertId;
      rol = 'paciente';
      await pool.query('UPDATE pacientes SET usuario_id = ? WHERE id = ?', [usuarioId, pacRows[0].id]);
    } else {
      usuarioId = userRows[0].id;
      rol = userRows[0].rol;
      const passwordHash = bcrypt.hashSync(cleanPassword, 10);

      await pool.query(
        'UPDATE usuarios SET password_hash = ?, debe_crear_password = FALSE, activo = TRUE WHERE id = ?',
        [passwordHash, usuarioId]
      );
    }

    // 2. Extraer IP y registrar consentimiento legal (Auditoría probatoria Ley 21.719)
    const rawIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || '127.0.0.1';
    const clientIp = rawIp.replace(/^::ffff:/, '');
    const versionLegal = 'Ley N° 21.719 Protección de Datos Personales y Salud Mental - V1.0 (Aceptado digitalmente al crear contraseña)';

    await pool.query(
      `INSERT INTO consentimientos_legales (usuario_id, tipo_ley, texto_version, aceptado, ip_origen, fecha_aceptacion)
       VALUES (?, 'Ley 21.719 Salud Mental y Datos Sensibles', ?, TRUE, ?, NOW())`,
      [usuarioId, versionLegal, clientIp]
    );

    const name = await getUserDisplayName(usuarioId, rol, targetEmail);

    res.json({
      success: true,
      message: '¡Contraseña creada exitosamente! Has iniciado sesión.',
      data: {
        email: targetEmail,
        role: rol,
        name,
      },
    });
  } catch (error) {
    console.error('Error en /api/auth/create-initial-password:', error);
    res.status(500).json({ success: false, error: 'Error al crear contraseña' });
  }
});

/**
 * GET /api/auth/register-psychologist
 * Muestra un formulario web amigable para que el administrador pueda registrar especialistas desde el navegador.
 */
authRouter.get('/register-psychologist', (_req: Request, res: Response): void => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Alta de Especialista - PsicoHábitos</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #F3F7F5;
      margin: 0;
      padding: 30px 16px;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      color: #1F2937;
    }
    .card {
      background: #FFFFFF;
      max-width: 520px;
      width: 100%;
      border-radius: 20px;
      padding: 32px;
      box-shadow: 0 10px 25px rgba(15, 97, 59, 0.08);
      border: 1px solid #E5EBF0;
    }
    .badge {
      display: inline-block;
      background: #E8F5E9;
      color: #0F613B;
      font-size: 12px;
      font-weight: 700;
      padding: 5px 12px;
      border-radius: 20px;
      margin-bottom: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    h1 {
      margin: 0 0 6px 0;
      font-size: 24px;
      color: #0F613B;
      font-weight: 800;
    }
    p.desc {
      margin: 0 0 24px 0;
      color: #6B7280;
      font-size: 14px;
      line-height: 1.5;
    }
    .form-group {
      margin-bottom: 16px;
    }
    label {
      display: block;
      font-size: 13px;
      font-weight: 600;
      color: #374151;
      margin-bottom: 6px;
    }
    input {
      width: 100%;
      padding: 12px 14px;
      border: 1.5px solid #D1D5DB;
      border-radius: 10px;
      font-size: 15px;
      outline: none;
      transition: border-color 0.2s;
    }
    input:focus {
      border-color: #0F613B;
    }
    .row {
      display: flex;
      gap: 12px;
    }
    .row .form-group {
      flex: 1;
    }
    button {
      width: 100%;
      background: #0F613B;
      color: #FFFFFF;
      padding: 14px;
      border: none;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 700;
      cursor: pointer;
      margin-top: 10px;
      transition: background 0.2s;
    }
    button:hover {
      background: #168A54;
    }
    button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .alert {
      padding: 14px;
      border-radius: 10px;
      margin-top: 20px;
      font-size: 14px;
      display: none;
      line-height: 1.5;
    }
    .alert-success {
      background: #DEF7EC;
      color: #03543F;
      border: 1px solid #BCF0DA;
    }
    .alert-error {
      background: #FDE8E8;
      color: #9B1C1C;
      border: 1px solid #FBD5D5;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">Portal Administrador</div>
    <h1>Alta de Especialista</h1>
    <p class="desc">Registra a un nuevo psicólogo/a en la plataforma. El sistema le enviará un correo automático de bienvenida invitándolo/a a definir su contraseña para acceder a su portal.</p>
    
    <form id="psicoForm">
      <div class="row">
        <div class="form-group">
          <label for="nombre">Nombre *</label>
          <input type="text" id="nombre" name="nombre" placeholder="Ej. Claudia" required>
        </div>
        <div class="form-group">
          <label for="apellidos">Apellidos *</label>
          <input type="text" id="apellidos" name="apellidos" placeholder="Ej. Rojas Mery" required>
        </div>
      </div>

      <div class="form-group">
        <label for="email">Correo Electrónico *</label>
        <input type="email" id="email" name="email" placeholder="ejemplo@correo.com" required>
      </div>

      <button type="submit" id="submitBtn">Registrar y Enviar Correo</button>
    </form>

    <div id="alertBox" class="alert"></div>
  </div>

  <script>
    const form = document.getElementById('psicoForm');
    const btn = document.getElementById('submitBtn');
    const alertBox = document.getElementById('alertBox');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      btn.disabled = true;
      btn.textContent = 'Procesando y enviando correo...';
      alertBox.style.display = 'none';

      const payload = {
        nombre: document.getElementById('nombre').value.trim(),
        apellidos: document.getElementById('apellidos').value.trim(),
        email: document.getElementById('email').value.trim(),
      };

      try {
        const res = await fetch('/api/auth/register-psychologist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (data.success) {
          alertBox.className = 'alert alert-success';
          alertBox.innerHTML = '✅ <strong>¡Especialista registrado con éxito!</strong><br>Se ha guardado en la base de datos y se ha enviado el correo de bienvenida a <strong>' + payload.email + '</strong>. Ya puede abrir la app y crear su contraseña.';
          alertBox.style.display = 'block';
          form.reset();
        } else {
          alertBox.className = 'alert alert-error';
          alertBox.innerHTML = '❌ ' + (data.error || 'Ocurrió un error al registrar.');
          alertBox.style.display = 'block';
        }
      } catch (err) {
        alertBox.className = 'alert alert-error';
        alertBox.innerHTML = '❌ Error de conexión con el servidor.';
        alertBox.style.display = 'block';
      } finally {
        btn.disabled = false;
        btn.textContent = 'Registrar y Enviar Correo';
      }
    });
  </script>
</body>
</html>
  `);
});

/**
 * POST /api/auth/register-psychologist
 * Registra a un nuevo especialista con correo sin contraseña para que active su cuenta.
 */
authRouter.post('/register-psychologist', async (req: Request, res: Response): Promise<void> => {
  try {
    const { nombre, apellidos, email } = req.body;

    if (!nombre || !apellidos || !email) {
      res.status(400).json({ success: false, error: 'Faltan campos obligatorios para el especialista' });
      return;
    }

    const targetEmail = String(email).trim().toLowerCase();

    // 1. Validar si el correo ya está registrado en usuarios
    const [existingUsers] = await pool.query<RowDataPacket[]>(
      'SELECT id, rol FROM usuarios WHERE email = ? LIMIT 1',
      [targetEmail]
    );

    if (existingUsers.length > 0) {
      const rolEncontrado = existingUsers[0].rol === 'paciente' ? 'un paciente' : 'un especialista / psicólogo';
      res.status(409).json({
        success: false,
        error: `El correo "${targetEmail}" ya se encuentra registrado en la plataforma como ${rolEncontrado}. No es posible registrar un nuevo especialista con este correo.`,
      });
      return;
    }

    // 2. Crear en usuarios con debe_crear_password = TRUE
    const [uResult] = await pool.query<ResultSetHeader>(
      `INSERT INTO usuarios (email, password_hash, rol, activo, debe_crear_password) 
       VALUES (?, NULL, 'psicologo', TRUE, TRUE)`,
      [targetEmail]
    );

    const usuarioId = uResult.insertId;

    // 3. Insertar en psicologos
    await pool.query(
      `INSERT INTO psicologos (usuario_id, nombre, apellidos) 
       VALUES (?, ?, ?)`,
      [
        usuarioId,
        nombre.trim(),
        apellidos.trim(),
      ]
    );

    // 3. Enviar correo de bienvenida al especialista
    emailService.sendPsychologistWelcomeEmail({
      to: targetEmail,
      psychologistName: `${nombre} ${apellidos}`,
    }).catch((err) => {
      console.warn('[register-psychologist] Advertencia al enviar correo:', err);
    });

    res.status(201).json({
      success: true,
      message: 'Especialista registrado correctamente. Se requerirá creación de contraseña en el primer acceso.',
      data: {
        email: targetEmail,
        nombre,
        apellidos,
        rol: 'psicologo',
      },
    });
  } catch (error) {
    console.error('Error en /api/auth/register-psychologist:', error);
    res.status(500).json({ success: false, error: 'Error al registrar psicólogo' });
  }
});

/**
 * POST /api/auth/login
 * Inicia sesión verificando credenciales o indicando si debe crear contraseña por primera vez.
 */
authRouter.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email) {
      res.status(400).json({ success: false, error: 'Por favor ingresa tu correo electrónico.' });
      return;
    }

    const targetEmail = String(email).trim().toLowerCase();
    const inputPassword = password ? String(password).trim() : '';

    // 1. Buscar usuario en MySQL
    const [userRows] = await pool.query<RowDataPacket[]>(
      'SELECT id, email, password_hash, rol, activo, debe_crear_password FROM usuarios WHERE email = ? LIMIT 1',
      [targetEmail]
    );

    if (userRows.length > 0) {
      const user = userRows[0];

      // Verificar si tiene contraseña pendiente de creación
      if (user.debe_crear_password || !user.password_hash) {
        const name = await getUserDisplayName(user.id, user.rol, user.email);
        res.json({
          success: false,
          requiresPasswordCreation: true,
          email: user.email,
          role: user.rol,
          name,
          message: 'Tu cuenta está registrada pero aún no has creado una contraseña. Por favor crea tu contraseña para continuar.',
        });
        return;
      }

      if (!inputPassword) {
        res.status(400).json({ success: false, error: 'Por favor ingresa tu contraseña.' });
        return;
      }

      // Validar requisitos de complejidad de la contraseña ingresada
      const complexity = validatePasswordComplexity(inputPassword);
      if (!complexity.isValid) {
        res.status(400).json({ success: false, error: complexity.error });
        return;
      }

      // Verificación de contraseña con hash bcrypt o texto plano de respaldo
      const isPasswordValid =
        bcrypt.compareSync(inputPassword, user.password_hash) ||
        inputPassword === user.password_hash;

      if (!isPasswordValid) {
        res.status(401).json({ success: false, error: 'Contraseña incorrecta. Por favor inténtalo de nuevo.' });
        return;
      }

      const name = await getUserDisplayName(user.id, user.rol, user.email);

      res.json({
        success: true,
        data: {
          email: user.email,
          role: user.rol,
          name,
        },
      });
      return;
    }

    // 2. Verificar si está registrado en la tabla pacientes sin usuario creado
    const [pacienteDirecto] = await pool.query<RowDataPacket[]>(
      'SELECT id, nombre, apellido_paterno FROM pacientes WHERE email = ? LIMIT 1',
      [targetEmail]
    );

    if (pacienteDirecto.length > 0) {
      const pac = pacienteDirecto[0];
      // Crear usuario pendiente
      const [uResult] = await pool.query<ResultSetHeader>(
        "INSERT INTO usuarios (email, password_hash, rol, activo, debe_crear_password) VALUES (?, NULL, 'paciente', TRUE, TRUE)",
        [targetEmail]
      );
      await pool.query('UPDATE pacientes SET usuario_id = ? WHERE id = ?', [uResult.insertId, pac.id]);

      res.json({
        success: false,
        requiresPasswordCreation: true,
        email: targetEmail,
        role: 'paciente',
        name: `${pac.nombre} ${pac.apellido_paterno}`,
        message: 'Tu especialista ha creado tu ficha. Por favor define tu contraseña de acceso.',
      });
      return;
    }

    // 3. Si el correo no existe en absoluto
    res.status(404).json({
      success: false,
      error: 'No existe una cuenta registrada con este correo electrónico. Contacta a tu especialista.',
    });
  } catch (error) {
    console.error('Error en /api/auth/login:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
});
