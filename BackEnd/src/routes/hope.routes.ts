import { Router, Request, Response } from 'express';
import { pool } from '../config/db';
import { RowDataPacket } from 'mysql2';
import { authMiddleware } from '../middlewares/authMiddleware';
import { processHopeMessage, startPsychometricTest, getHopeHistory, checkHopeEngineHealth } from '../H.o.p.e/hope.service';
import { PSYCHOMETRIC_TESTS } from '../H.o.p.e/tests.data';

export const hopeRouter = Router();

// Todas las rutas de Hope requieren autenticación JWT
hopeRouter.use(authMiddleware);

/**
 * Resuelve el paciente_id a partir del usuario en sesión.
 */
async function getPacienteIdFromUser(userId: number, email: string): Promise<number | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT id FROM pacientes WHERE usuario_id = ? OR LOWER(email) = ? LIMIT 1',
    [userId, email.toLowerCase()]
  );
  return rows.length > 0 ? rows[0].id : null;
}

/**
 * GET /api/hope/status
 * Verifica el estado real de H.o.p.e comprobando directamente el motor de IA en local.
 */
hopeRouter.get('/status', async (_req: Request, res: Response): Promise<void> => {
  const isOnline = await checkHopeEngineHealth();
  res.json({
    success: true,
    online: isOnline,
    status: isOnline ? 'online' : 'offline'
  });
});

/**
 * GET /api/hope/tests
 * Retorna el catálogo de tests disponibles para información general.
 */
hopeRouter.get('/tests', (req: Request, res: Response): void => {
  const testsList = Object.values(PSYCHOMETRIC_TESTS).map(t => ({
    id: t.id,
    name: t.name,
    shortName: t.shortName,
    targetClinicalArea: t.targetClinicalArea,
    totalQuestions: t.items.length,
    instructions: t.instructionsPatient
  }));

  res.json({ success: true, tests: testsList });
});

/**
 * POST /api/hope/chat
 * Envía un mensaje a H.o.p.e (conversación libre o continuación de test).
 */
hopeRouter.post('/chat', async (req: Request, res: Response): Promise<void> => {
  try {
    const { message } = req.body;
    if (!message || typeof message !== 'string' || !message.trim()) {
      res.status(400).json({ success: false, error: 'El mensaje no puede estar vacío.' });
      return;
    }

    if (!req.user) {
      res.status(401).json({ success: false, error: 'Sesión no válida.' });
      return;
    }

    const pacienteId = await getPacienteIdFromUser(req.user.userId, req.user.email);
    if (!pacienteId) {
      res.status(403).json({ success: false, error: 'Solo los pacientes registrados pueden conversar con H.o.p.e.' });
      return;
    }

    const result = await processHopeMessage(pacienteId, message.trim());

    res.json({
      success: true,
      reply: result.reply,
      sessionId: result.sessionId,
      isCrisisAlert: result.isCrisisAlert || false,
      isFinalized: result.isFinalized || false,
    });
  } catch (error: any) {
    console.error('❌ [Hope Chat Error]:', error);
    res.status(500).json({
      success: false,
      error: 'Ocurrió una dificultad al procesar la respuesta de H.o.p.e. Por favor intenta nuevamente.'
    });
  }
});

/**
 * POST /api/hope/test/start
 * Inicia la aplicación de uno de los 3 tests psicométricos (tas-20, dass-21, scl-90-r).
 */
hopeRouter.post('/test/start', async (req: Request, res: Response): Promise<void> => {
  try {
    const { testId } = req.body;
    if (!testId || !PSYCHOMETRIC_TESTS[testId]) {
      res.status(400).json({
        success: false,
        error: `Test no válido. Opciones permitidas: ${Object.keys(PSYCHOMETRIC_TESTS).join(', ')}`
      });
      return;
    }

    if (!req.user) {
      res.status(401).json({ success: false, error: 'Sesión no válida.' });
      return;
    }

    const pacienteId = await getPacienteIdFromUser(req.user.userId, req.user.email);
    if (!pacienteId) {
      res.status(403).json({ success: false, error: 'Acceso restringido a pacientes.' });
      return;
    }

    const result = await startPsychometricTest(pacienteId, testId);

    res.json({
      success: true,
      sessionId: result.sessionId,
      message: result.message
    });
  } catch (error: any) {
    console.error('❌ [Hope Start Test Error]:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/hope/history
 * Obtiene el historial de sesiones y mensajes.
 * Si quien consulta es psicólogo, incluye los resúmenes clínicos de los tests.
 */
hopeRouter.get('/history', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Sesión no válida.' });
      return;
    }

    const isPsychologist = req.user.role === 'psicologo';
    let targetPacienteId: number | null = null;

    if (isPsychologist) {
      const qPacienteId = Number(req.query.pacienteId);
      if (!qPacienteId) {
        res.status(400).json({ success: false, error: 'Debe especificar el pacienteId en la consulta.' });
        return;
      }
      targetPacienteId = qPacienteId;
    } else {
      targetPacienteId = await getPacienteIdFromUser(req.user.userId, req.user.email);
    }

    if (!targetPacienteId) {
      res.status(404).json({ success: false, error: 'Paciente no encontrado.' });
      return;
    }

    const history = await getHopeHistory(targetPacienteId, isPsychologist);
    res.json({ success: true, history });
  } catch (error: any) {
    console.error('❌ [Hope History Error]:', error);
    res.status(500).json({ success: false, error: 'Error al consultar el historial de H.o.p.e.' });
  }
});
