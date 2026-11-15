import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { config } from './config/index.js';
import { requestLogger } from './middleware/requestLogger.js';
import { errorHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/auth.js';
import adminAcademicRoutes from './routes/adminAcademic.js';
import attendanceRoutes from './routes/attendance.js';
import studentRoutes from './routes/student.js';
import examRoutes from './routes/exam.js';
import feeRoutes from './routes/fee.js';
import reportRoutes from './routes/report.js';
import teacherRoutes from './routes/teacher.js';
import guardianRoutes from './routes/guardian.js';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';
import fs from 'fs';

const app = express();

const openApiPath = fs.existsSync(path.resolve('docs/openapi.yaml'))
  ? path.resolve('docs/openapi.yaml')
  : path.resolve('../docs/openapi.yaml');

const swaggerDocument = YAML.load(openApiPath);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use(helmet());

const rawOrigins = [
  config.clientOrigin,
  config.corsOrigin,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
].filter(Boolean);

const allowedOrigins = new Set(
  rawOrigins
    .flatMap((o) => (typeof o === 'string' ? o.split(',') : []))
    .map((s) => s.trim().replace(/\/+$/, ''))
    .filter(Boolean)
);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const cleanOrigin = origin.replace(/\/+$/, '');
      if (
        allowedOrigins.has(cleanOrigin) ||
        cleanOrigin.endsWith('.vercel.app') ||
        process.env.NODE_ENV !== 'production'
      ) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(requestLogger);

// Limit all /api routes to 200 requests per 15-minute window per IP.
app.use(
  '/api/',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.get('/', (_req, res) => {
  res.json({
    name: 'School Management System API',
    status: 'online',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      docs: '/api-docs',
    },
  });
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminAcademicRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/fees', feeRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/guardian', guardianRoutes);

app.use(errorHandler);

export default app;
