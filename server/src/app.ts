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

// Trust reverse proxy hops (Render, Cloudflare, AWS ELB, etc.)
app.set('trust proxy', 1);

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
  validate: { xForwardedForHeader: false },
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

// Locate frontend build directory if present
const candidateDistDirs = [
  path.resolve(process.cwd(), 'frontend/dist'),
  path.resolve(process.cwd(), 'dist'),
  path.resolve(__dirname, '../../frontend/dist'),
  path.resolve(__dirname, '../frontend/dist'),
];

let frontendDistPath: string | null = null;
for (const dir of candidateDistDirs) {
  if (fs.existsSync(path.join(dir, 'index.html'))) {
    frontendDistPath = dir;
    break;
  }
}

if (frontendDistPath) {
  app.use(express.static(frontendDistPath, { index: false }));
}

// Health routes
app.use('/health', healthRoutes);
app.use('/api/health', healthRoutes);

// API v1 Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/areas', areasRoutes);
app.use('/api/v1/cases', casesRoutes);
app.use('/api/v1/rewards', rewardsRoutes);
app.use('/api/v1/ai', aiRoutes);

// Root route (API info & health check, or frontend index if browser request)
app.get('/', (req: Request, res: Response) => {
  const isHtmlNavigation = Boolean(
    req.headers.accept && req.headers.accept.includes('text/html')
  );
  if (isHtmlNavigation && frontendDistPath) {
    return res.sendFile(path.join(frontendDistPath, 'index.html'));
  }
  res.json({
    status: 'online',
    app: 'CitizenCivic Node.js Express API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Client-side SPA routing fallback for non-API/non-media routes
app.get('*', (req: Request, res: Response, next: NextFunction) => {
  if (
    req.path.startsWith('/api') ||
    req.path.startsWith('/media') ||
    req.path.startsWith('/health')
  ) {
    return next();
  }
  if (frontendDistPath) {
    return res.sendFile(path.join(frontendDistPath, 'index.html'));
  }
  next();
});

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
