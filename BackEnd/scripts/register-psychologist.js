const mysql = require('mysql2/promise');
require('dotenv').config();
const { emailService } = require('../dist/services/emailService.js');

async function main() {
  const args = process.argv.slice(2);
  const nombre = args[0] || process.env.PSICO_NOMBRE;
  const apellidos = args[1] || process.env.PSICO_APELLIDOS;
  const email = args[2] || process.env.PSICO_EMAIL;

  if (!nombre || !apellidos || !email) {
    console.log(`
Uso del comando:
  node scripts/register-psychologist.js "<Nombre>" "<Apellidos>" "<Correo>"

Ejemplo:
  node scripts/register-psychologist.js "Claudia" "Rojas Mery" "claudia.rojas@gmail.com"
    `);
    process.exit(1);
  }

  const targetEmail = String(email).trim().toLowerCase();

  console.log(`\n⏳ Registrando nuevo especialista: ${nombre} ${apellidos} (${targetEmail})...`);

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Admin123@',
    database: process.env.DB_NAME || 'psicohabitos_db',
  });

  try {
    // 1. Validar si el correo ya existe
    const [existingUsers] = await conn.query(
      'SELECT id, rol FROM usuarios WHERE email = ? LIMIT 1',
      [targetEmail]
    );

    if (existingUsers.length > 0) {
      console.error(`❌ Error: El correo "${targetEmail}" ya se encuentra registrado en el sistema (rol: ${existingUsers[0].rol}).`);
      process.exit(1);
    }

    // 2. Crear en usuarios
    const [uResult] = await conn.query(
      `INSERT INTO usuarios (email, password_hash, rol, activo, debe_crear_password) 
       VALUES (?, NULL, 'psicologo', TRUE, TRUE)`,
      [targetEmail]
    );

    const usuarioId = uResult.insertId;

    // 3. Insertar en psicologos
    await conn.query(
      `INSERT INTO psicologos (usuario_id, nombre, apellidos) 
       VALUES (?, ?, ?)`,
      [usuarioId, nombre.trim(), apellidos.trim()]
    );

    console.log(`✅ [Base de Datos] Especialista guardado con éxito (Usuario ID: ${usuarioId}).`);

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
