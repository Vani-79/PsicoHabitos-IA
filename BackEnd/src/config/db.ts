import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.DB_PASSWORD && process.env.NODE_ENV === 'production') {
  throw new Error('❌ [Seguridad] DB_PASSWORD no está configurada en las variables de entorno.');
}

export const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'psicohabitos_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: process.env.DB_TIMEZONE || '-03:00',
  dateStrings: true,
});


/**
 * Prueba la conectividad con la base de datos al iniciar el servidor
 */
export async function testDbConnection(): Promise<void> {
  try {
    const connection = await pool.getConnection();
    console.log('✅ [MySQL] Conexión establecida exitosamente con la base de datos psicohabitos_db');
    
    // Configurar zona horaria en MySQL a UTC-3 (Chile) para sincronizar NOW() y CURDATE()
    await connection.query("SET GLOBAL time_zone = '-03:00';");
    await connection.query("SET PERSIST time_zone = '-03:00';");
    await connection.query("SET time_zone = '-03:00';");

    // Asegurar existencia de tabla codigos_recuperacion
    await connection.query(`
      CREATE TABLE IF NOT EXISTS codigos_recuperacion (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(120) NOT NULL,
        codigo VARCHAR(6) NOT NULL,
        expira_en DATETIME NOT NULL,
        usado BOOLEAN NOT NULL DEFAULT FALSE,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_codigos_email_codigo (email, codigo, usado)
      ) ENGINE=InnoDB;
    `);
    connection.release();
  } catch (error) {
    console.error('❌ [MySQL] Error al conectar con la base de datos:', error);
  }
}
