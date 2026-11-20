/**
 * HTTP Server Entry Point
 * 
 * Verifies database connection and boots Express HTTP server.
 */

const app = require('./app');
const env = require('./config/env');
const { testConnection } = require('./config/db');

async function startServer() {
  console.log('----------------------------------------------------');
  console.log(' Starting Academic Resource Sharing Hub Backend...  ');
  console.log('----------------------------------------------------');

  // Verify database connectivity
  await testConnection();

  const PORT = env.PORT;
  const server = app.listen(PORT, () => {
    console.log(`[Server] Running in ${env.NODE_ENV} mode on http://localhost:${PORT}`);
    console.log(`[Health] Check health at: http://localhost:${PORT}/api/health`);
    console.log('----------------------------------------------------');
  });

  // Handle graceful shutdown
  const shutdown = (signal) => {
    console.log(`\n[Server] Received ${signal}. Shutting down gracefully...`);
    server.close(() => {
      console.log('[Server] HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

startServer().catch((err) => {
  console.error('[Server Error] Startup failure:', err);
  process.exit(1);
});
