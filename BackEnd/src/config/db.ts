import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

export const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'Admin123@',
  database: process.env.DB_NAME || 'psicohabitos_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

/**
 * Prueba la conectividad con la base de datos al iniciar el servidor
 */
export async function testDbConnection(): Promise<void> {
  try {
    const connection = await pool.getConnection();
    console.log('✅ [MySQL] Conexión establecida exitosamente con la base de datos psicohabitos_db');
    connection.release();
  } catch (error) {
    console.error('❌ [MySQL] Error al conectar con la base de datos:', error);
  }
}
