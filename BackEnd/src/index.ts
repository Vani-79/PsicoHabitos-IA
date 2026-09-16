import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { testDbConnection } from './config/db';
import { authRouter } from './routes/auth.routes';
import { patientRouter } from './routes/patient.routes';
import { habitRouter } from './routes/habit.routes';

dotenv.config();

const app = express();
app.disable('x-powered-by');
const PORT = Number(process.env.PORT) || 3000;

// Configuración segura de CORS
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim())
  : [
    'http://localhost:8081', // Expo Web / Metro bundler
    'http://localhost:3000', // Backend local
    'http://localhost:19006', // Expo Web alternativo
  ];

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Permitir solicitudes sin encabezado Origin (como apps móviles nativas Expo/React Native, curl o Postman)
    if (!origin) {
      return callback(null, true);
    }

    // Permitir si el origen está explícitamente en la lista blanca
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // En desarrollo, permitir orígenes locales dinámicos (localhost, 127.0.0.1 o LAN 192.168.x.x)
    if (
      process.env.NODE_ENV !== 'production' &&
      (origin.startsWith('http://localhost:') ||
        origin.startsWith('http://127.0.0.1:') ||
        origin.startsWith('https://192.168.'))
    ) {
      return callback(null, true);
    }

    return callback(new Error(`Bloqueado por política CORS: el origen ${origin} no está autorizado.`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// Middlewares
app.use(cors(corsOptions));
app.use(express.json());

// Verificación de estado del servidor (Health Check)
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'PsicoHábitos Backend API operativa', timestamp: new Date() });
});

// Enlace amigable para el formulario de registro de especialistas
app.get(['/RegistroNuevoPsicologo', '/registronuevopsicologo'], (req, res, next) => {
  req.url = '/register-psychologist';
  authRouter(req, res, next);
});

// Rutas API
app.use('/api/auth', authRouter);
app.use('/api/patients', patientRouter);
app.use('/api/habits', habitRouter);

// Manejador de errores (captura bloqueos de CORS)
app.use((err: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof Error && err.message.includes('CORS')) {
    res.status(403).json({ success: false, error: err.message });
    return;
  }
  next(err);
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`🚀 [Servidor] Backend de PsicoHábitos corriendo en http://localhost:${PORT}`);
  await testDbConnection();
});
