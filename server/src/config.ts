import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

// Robustly load .env across monorepo runtime environments
const candidateEnvPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '../.env'),
  path.resolve(__dirname, '../../.env'),
  path.resolve(__dirname, '../.env'),
  path.resolve(__dirname, '.env'),
];

for (const envPath of candidateEnvPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
}
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
  openaiApiKey: process.env.OPENAI_API_KEY || (process.env.GEMINI_API_KEY?.startsWith('sk-') ? process.env.GEMINI_API_KEY : ''),
  
  // Storage (S3-compatible with local fallback)
  mediaStorageBackend: process.env.MEDIA_STORAGE_BACKEND || 'local',
  awsBucket: process.env.AWS_STORAGE_BUCKET_NAME || process.env.AWS_BUCKET || 'uploads',
  awsRegion: process.env.AWS_REGION || 'ap-southeast-1',
  awsEndpointUrl: process.env.AWS_ENDPOINT_URL_S3 || process.env.AWS_ENDPOINT_URL || '',
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  awsS3ForcePathStyle: (process.env.AWS_S3_ADDRESSING_STYLE || 'path') === 'path',
  uploadDir: path.resolve(__dirname, '../uploads'),

  // Google Maps
  googleMapsApiKey: process.env.GOOGLE_MAPS_API || process.env.GOOGLE_MAPS_API_KEY || '',

  // Resend Email Notifications
  resendApiKey: process.env.RESEND_API_KEY || '',
  resendFromEmail: process.env.RESEND_FROM_EMAIL || 'CitizenCivic Notifications <notifications@citizencivic.org>',
};
