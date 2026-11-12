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
app.use(cors({ origin: config.corsOrigin, credentials: true }));
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

app.use(errorHandler);

export default app;
