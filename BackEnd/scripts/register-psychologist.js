const mysql = require('mysql2/promise');
require('dotenv').config();
const { emailService } = require('../dist/services/emailService.js');

async function main() {
  const args = process.argv.slice(2);
  const nombre = args[0] || process.env.PSICO_NOMBRE;
  const apellidos = args[1] || process.env.PSICO_APELLIDOS;
  const email = args[2] || process.env.PSICO_EMAIL;
  const meses = Math.max(1, Number(args[3] || process.env.PSICO_MESES) || 1);

  if (!nombre || !apellidos || !email) {
    console.log(`
Uso del comando:
  node scripts/register-psychologist.js "<Nombre>" "<Apellidos>" "<Correo>" [Meses=1]

Ejemplo (Plan Mensual por defecto):
  node scripts/register-psychologist.js "Claudia" "Rojas Mery" "claudia.rojas@gmail.com" 1
    `);
    process.exit(1);
  }

  const targetEmail = String(email).trim().toLowerCase();

  console.log(`\n⏳ Registrando nuevo especialista: ${nombre} ${apellidos} (${targetEmail}) con ${meses} mes(es) de suscripción...`);

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Admin123@',
    database: process.env.DB_NAME || 'psicohabitos_db',
  });

  try {
    // 1. Validar si ya está registrado en psicologos
    const [existingPsicos] = await conn.query(
      'SELECT id FROM psicologos WHERE email = ? LIMIT 1',
      [targetEmail]
    );

    if (existingPsicos.length > 0) {
      console.error(`❌ Error: El correo "${targetEmail}" ya se encuentra registrado como especialista en el sistema.`);
      process.exit(1);
    }

    const [existingUsers] = await conn.query(
      'SELECT id, rol FROM usuarios WHERE email = ? LIMIT 1',
      [targetEmail]
    );

    let usuarioId;

    if (existingUsers.length > 0) {
      usuarioId = existingUsers[0].id;
      await conn.query("UPDATE usuarios SET rol = 'ambos' WHERE id = ?", [usuarioId]);
      console.log(`ℹ️ Usuario existente detectado (ID: ${usuarioId}). Se habilitó rol dual 'ambos'.`);
    } else {
      // 2. Crear en usuarios
      const [uResult] = await conn.query(
        `INSERT INTO usuarios (email, password_hash, rol, activo, debe_crear_password) 
         VALUES (?, NULL, 'psicologo', TRUE, TRUE)`,
        [targetEmail]
      );
      usuarioId = uResult.insertId;
    }

    // 3. Insertar en psicologos con suscripción
    await conn.query(
      `INSERT INTO psicologos (usuario_id, nombre, apellidos, email, suscripcion_meses, suscripcion_inicio, suscripcion_fin, suscripcion_activa) 
       VALUES (?, ?, ?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL ? MONTH), TRUE)`,
      [usuarioId, nombre.trim(), apellidos.trim(), targetEmail, meses, meses]
    );

    console.log(`✅ [Base de Datos] Especialista guardado con éxito con ${meses} mes(es) de suscripción (Usuario ID: ${usuarioId}).`);

    // 3. Enviar correo de bienvenida al especialista
    console.log(`📧 Enviando correo de bienvenida a ${targetEmail}...`);
    await emailService.sendPsychologistWelcomeEmail({
      to: targetEmail,
      psychologistName: `${nombre} ${apellidos}`,
    });

    console.log(`
🎉 ¡Proceso completado exitosamente!
El/la especialista ${nombre} ${apellidos} ya está en la base de datos y ha recibido el correo.
Cuando ingrese a la app con "${targetEmail}", se le solicitará crear su contraseña y entrará a su Portal de Especialista.
    `);
  } catch (err) {
    console.error('❌ Error registrando especialista:', err);
  } finally {
    await conn.end();
  }
}

main();
