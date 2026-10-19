import path from 'path';
import dotenv from 'dotenv';

// Load .env from project root if available, otherwise server/.env
const rootEnvPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: rootEnvPath });
dotenv.config(); // fallback

export const config = {
  port: parseInt(process.env.PORT || '8000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  
  // Database
  databaseUrl: process.env.DATABASE_URL || '',
  
  // Security & JWT
  jwtSecret: process.env.JWT_SECRET || process.env.SECRET_KEY || 'citizencivic-dev-jwt-secret-do-not-use-in-production',
  jwtAccessExpiry: '1h',
  jwtRefreshExpiry: '7d',
  
  // CORS
  corsOrigins: (process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean),

  // OpenAI
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  
  // Storage (S3-compatible with local fallback)
  mediaStorageBackend: process.env.MEDIA_STORAGE_BACKEND || 'local',
  awsBucket: process.env.AWS_STORAGE_BUCKET_NAME || 'assets',
  awsRegion: process.env.AWS_REGION || 'ap-southeast-1',
  awsEndpointUrl: process.env.AWS_ENDPOINT_URL || '',
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  awsS3ForcePathStyle: (process.env.AWS_S3_ADDRESSING_STYLE || 'path') === 'path',
  uploadDir: path.resolve(__dirname, '../uploads'),
};
