import { app } from './app';
import { config } from './config';
import { checkDatabaseConnection, pool } from './db';

const PORT = config.port;
const HOST = '0.0.0.0';

async function startServer() {
  console.log(`[server] Initializing CitizenCivic Node.js API...`);
  
  // Verify database connection to Neon PostgreSQL
  const dbOk = await checkDatabaseConnection();
  if (!dbOk) {
    console.warn(`[server] WARNING: Database connection check returned false. Retrying in background...`);
  }

  const server = app.listen(PORT, HOST, () => {
    console.log(`[server] CitizenCivic API listening on http://${HOST}:${PORT}`);
    console.log(`[server] Environment: ${config.nodeEnv}`);
    console.log(`[server] Ready to process requests.`);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`[server] Received ${signal}. Shutting down gracefully...`);
    server.close(async () => {
      console.log(`[server] HTTP server closed.`);
      try {
        await pool.end();
        console.log(`[server] Database connection pool closed.`);
      } catch (err: any) {
        console.error(`[server] Error closing pool:`, err.message);
      }
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

startServer();
