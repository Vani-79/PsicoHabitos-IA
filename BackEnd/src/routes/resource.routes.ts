import { Router, Request, Response } from 'express';
import { pool } from '../config/db';
import { RowDataPacket } from 'mysql2';
import { authMiddleware } from '../middlewares/authMiddleware';

export const resourceRouter = Router();

// Todas las rutas de recursos requieren autenticación
resourceRouter.use(authMiddleware);

export interface RecursoPacienteRow extends RowDataPacket {
  id: number;
  seccion: string;
  tipo_tecnica: string;
  titulo: string;
  descripcion: string;
  video_url: string;
  miniatura_url: string | null;
  duracion_segundos: number | null;
  segundo_inicio: number;
  segundo_fin: number | null;
  orden: number;
  activo: number | boolean;
  created_at: string;
}

/**
 * GET /api/resources
 * Obtiene todos los recursos de apoyo activos, opcionalmente filtrados por query parameter ?seccion=ansiedad
 */
resourceRouter.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { seccion } = req.query;

    let query = `
      SELECT id, seccion, tipo_tecnica, titulo, descripcion, video_url, 
             miniatura_url, duracion_segundos, segundo_inicio, segundo_fin, 
             orden, activo, created_at
      FROM recursos_paciente
      WHERE activo = TRUE
    `;
    const params: unknown[] = [];

    if (seccion && typeof seccion === 'string' && seccion.trim() !== '') {
      query += ' AND LOWER(seccion) = LOWER(?)';
      params.push(seccion.trim());
    }

    query += ' ORDER BY orden ASC, id ASC';

    const [rows] = await pool.query<RecursoPacienteRow[]>(query, params);

    res.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error('❌ [ResourceRoutes] Error al obtener recursos:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno al consultar los recursos terapéuticos.',
    });
  }
});

/**
 * GET /api/resources/:seccion
 * Obtiene los recursos de apoyo activos para una sección específica (ansiedad, estres, sueno, etc.)
 */
resourceRouter.get('/:seccion', async (req: Request, res: Response): Promise<void> => {
  try {
    const seccionRaw = req.params.seccion;
    const cleanSeccion = (Array.isArray(seccionRaw) ? seccionRaw[0] : seccionRaw || '').trim();

    const [rows] = await pool.query<RecursoPacienteRow[]>(
      `SELECT id, seccion, tipo_tecnica, titulo, descripcion, video_url, 
              miniatura_url, duracion_segundos, segundo_inicio, segundo_fin, 
              orden, activo, created_at
       FROM recursos_paciente
       WHERE activo = TRUE AND LOWER(seccion) = LOWER(?)
       ORDER BY orden ASC, id ASC`,
      [cleanSeccion]
    );

    res.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error('❌ [ResourceRoutes] Error al consultar sección de recursos:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno al consultar los recursos terapéuticos por sección.',
    });
  }
});
