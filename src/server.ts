import http from "http";
import app from "./app";
import env from "./config/env";
import { connectDatabase, disconnectDatabase } from "./config/database";
import { resetProcessLocks } from "./utils/lock.util";

let server: http.Server | null = null;
let isShuttingDown = false;

/**
 * Initializes database connection and starts listening on the configured port.
 */
async function startServer(): Promise<void> {
  try {
    console.log("🚀 [SERVER] Starting Standalone Express Cron Cleanup Service...");
    console.log(`🌍 [SERVER] Environment: ${env.NODE_ENV}`);

    // Connect to MongoDB
    await connectDatabase();

    // Start HTTP listener
    server = app.listen(env.PORT, () => {
      console.log(`⚡ [SERVER] Listening on port ${env.PORT}`);
      console.log(`🔗 [SERVER] Cron Media Endpoint:   http://localhost:${env.PORT}/api/cron/media`);
      console.log(`🔗 [SERVER] Cron Records Endpoint: http://localhost:${env.PORT}/api/cron/records`);
      console.log(`🏥 [SERVER] Health Check:          http://localhost:${env.PORT}/health`);
    });

    // Configure connection timeouts suitable for batch cleanup workloads
    server.timeout = 300000; // 5 minutes
    server.keepAliveTimeout = 65000;
  } catch (error) {
    console.error("💥 [SERVER] Fatal error during startup:", error);
    process.exit(1);
  }
}

/**
 * Graceful shutdown handler.
 * Closes HTTP listener, waits for in-flight requests, and disconnects MongoDB.
 */
async function gracefulShutdown(signal: string): Promise<void> {
  if (isShuttingDown) {
    return;
  }
  isShuttingDown = true;

  console.log(`\n🛑 [SERVER] Received ${signal}. Initiating graceful shutdown...`);

  // Force exit timeout if cleanup hangs
  const forceExitTimer = setTimeout(() => {
    console.error("⚠️ [SERVER] Graceful shutdown timed out. Forcing process exit.");
    process.exit(1);
  }, 15000);

  try {
    // 1. Stop accepting new HTTP requests
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server!.close((err) => {
          if (err) return reject(err);
          console.log("🔒 [SERVER] HTTP server closed");
          resolve();
        });
      });
    }

    // 2. Clear active in-process locks
    resetProcessLocks();

    // 3. Disconnect from database
    await disconnectDatabase();
    console.log("🔌 [SERVER] Database connections closed");

    clearTimeout(forceExitTimer);
    console.log("👋 [SERVER] Graceful shutdown complete. Exiting process.");
    process.exit(0);
  } catch (err) {
    clearTimeout(forceExitTimer);
    console.error("💥 [SERVER] Error during graceful shutdown:", err);
    process.exit(1);
  }
}

// Process signal listeners
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Uncaught exceptions and rejections
process.on("uncaughtException", (err) => {
  console.error("💥 [FATAL] Uncaught Exception:", err);
  gracefulShutdown("uncaughtException");
});

process.on("unhandledRejection", (reason) => {
  console.error("💥 [FATAL] Unhandled Rejection:", reason);
  gracefulShutdown("unhandledRejection");
});

// Start the server if this file is executed directly
if (require.main === module) {
  startServer();
}

export { startServer, gracefulShutdown };
