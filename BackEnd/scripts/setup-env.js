const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const envPath = path.join(__dirname, '..', '.env');
const examplePath = path.join(__dirname, '..', '.env.example');

console.log('🔧 [Setup Env] Configurando variables de entorno para PsicoHábitos BackEnd...');

// Generar una clave secreta JWT criptográficamente segura y fija
const generatedJwtSecret = crypto.randomBytes(32).toString('hex');

if (fs.existsSync(envPath)) {
  console.log('ℹ️ [Setup Env] El archivo .env ya existe.');
  const currentContent = fs.readFileSync(envPath, 'utf8');

  let updated = false;
  let newContent = currentContent;

  // Si no tiene JWT_SECRET o está vacío, agregarlo para evitar invalidación de tokens en recargas
  if (!/JWT_SECRET=\S+/i.test(currentContent)) {
    console.log('🔑 [Setup Env] Inyectando JWT_SECRET persistente para evitar desconexiones de sesión...');
    newContent += `\n# Clave secreta JWT persistente autogenerada\nJWT_SECRET=${generatedJwtSecret}\n`;
    updated = true;
  }

  // Si no tiene DB_TIMEZONE, agregarlo
  if (!/DB_TIMEZONE=/i.test(currentContent)) {
    console.log('⏰ [Setup Env] Inyectando DB_TIMEZONE=-03:00...');
    newContent += `\nDB_TIMEZONE=-03:00\n`;
    updated = true;
  }

  if (updated) {
    fs.writeFileSync(envPath, newContent, 'utf8');
    console.log('✅ [Setup Env] Archivo .env actualizado exitosamente.');
  } else {
    console.log('✅ [Setup Env] El archivo .env ya contiene las configuraciones esenciales.');
  }
} else {
  // Crear archivo .env nuevo
  const defaultEnvContent = `# ==============================================================================
# CONFIGURACIÓN GENERAL DEL SERVIDOR
# ==============================================================================
PORT=3000
NODE_ENV=development

# Orígenes permitidos para CORS (separados por coma)
ALLOWED_ORIGINS=http://localhost:8081,http://localhost:3000,http://localhost:19006

# ==============================================================================
# CONEXIÓN A LA BASE DE DATOS MYSQL 8.0
# ==============================================================================
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=tu_contraseña_aqui
DB_NAME=psicohabitos_db
DB_TIMEZONE=-03:00

# ==============================================================================
# SEGURIDAD Y AUTENTICACIÓN JWT (Clave fija para mantener sesiones activas)
# ==============================================================================
JWT_SECRET=${generatedJwtSecret}
JWT_EXPIRES_IN=7d

# ==============================================================================
# SERVICIO OFICIAL DE CORREOS PSICOHÁBITOS (Gmail SMTP)
# ==============================================================================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=psicohabitos.ia@gmail.com
SMTP_FROM="PsicoHábitos" <psicohabitos.ia@gmail.com>

# 🔑 Contraseña de Aplicación de 16 caracteres de Google:
# - Para pruebas locales sin configurar nada: Déjala vacía. El backend imprimirá
#   los códigos OTP de 6 dígitos directamente en la terminal (Modo Consola).
# - Para enviar correos reales con la cuenta de PsicoHábitos: Pega aquí la clave
#   de aplicación de 16 letras compartida por el equipo.
SMTP_PASS=
`;

  fs.writeFileSync(envPath, defaultEnvContent, 'utf8');
  console.log('✅ [Setup Env] Archivo .env creado exitosamente con JWT_SECRET seguro y modo OTP de consola activo.');
}

console.log(`
🎉 ¡Entorno listo!
👉 JWT_SECRET persistente configurado.
👉 Modo de Códigos OTP: Los códigos de verificación y recuperación se imprimirán en la terminal del backend.
`);
