import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import { config } from './config';

import healthRoutes from './routes/health.routes';
import authRoutes from './routes/auth.routes';
import areasRoutes from './routes/areas.routes';
import casesRoutes from './routes/cases.routes';
import rewardsRoutes from './routes/rewards.routes';
import aiRoutes from './routes/ai.routes';

export const app = express();

// Security Headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// CORS
const allowedOriginRegexes = [
  /^https:\/\/.*\.onrender\.com$/,
  /^https:\/\/.*\.pages\.dev$/,
  /^http:\/\/localhost:\d+$/,
  /^http:\/\/127\.0\.0\.1:\d+$/,
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (config.corsOrigins.includes(origin)) return callback(null, true);
      if (allowedOriginRegexes.some((regex) => regex.test(origin))) {
        return callback(null, true);
      }
      // In development, allow any localhost
      if (!config.isProduction) return callback(null, true);
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
  })
);

// Rate Limiting
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 180, // max 180 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { detail: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// Request parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Ensure upload directory exists and serve local media
if (!fs.existsSync(config.uploadDir)) {
  fs.mkdirSync(config.uploadDir, { recursive: true });
}
app.use('/media', express.static(config.uploadDir));

// Root route (API info & health check)
app.get('/', (_req: Request, res: Response) => {
  res.json({
    status: 'online',
    app: 'CitizenCivic Node.js Express API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Health routes
app.use('/health', healthRoutes);
app.use('/api/health', healthRoutes);

// API v1 Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/areas', areasRoutes);
app.use('/api/v1/cases', casesRoutes);
app.use('/api/v1/rewards', rewardsRoutes);
app.use('/api/v1/ai', aiRoutes);

// 404 Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    detail: `Not Found: The requested URL ${req.originalUrl} was not found on this server.`,
  });
});

// Global Error Handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[server/error]', err);
  const status = err.status || 500;
  res.status(status).json({
    detail: err.message || 'Internal server error occurred.',
  });
});
