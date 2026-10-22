import { Router, Request, Response } from "express";
import { getDatabaseStatus } from "../config/database";

const router = Router();

/**
 * GET /health
 * Basic liveness check.
 */
router.get("/health", (_req: Request, res: Response) => {
  const dbStatus = getDatabaseStatus();

  res.status(dbStatus.isConnected ? 200 : 503).json({
    status: dbStatus.isConnected ? "ok" : "degraded",
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    database: {
      connected: dbStatus.isConnected,
      supportsTransactions: dbStatus.supportsTransactions,
    },
  });
});

/**
 * GET /ready
 * Readiness check for load balancers and orchestrators.
 */
router.get("/ready", (_req: Request, res: Response) => {
  const dbStatus = getDatabaseStatus();

  if (dbStatus.isConnected) {
    res.status(200).json({ ready: true });
  } else {
    res.status(503).json({ ready: false, reason: "Database not connected" });
  }
});

export default router;
