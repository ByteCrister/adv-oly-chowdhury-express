import { Router, Request, Response } from "express";
import cronRoutes from "./cron.routes";
import healthRoutes from "./health.routes";

const router = Router();

// Mount health and readiness endpoints
router.use("/", healthRoutes);
router.use("/api", healthRoutes);

// Mount cron cleanup endpoints with backward-compatible paths:
// /api/cron/media, /api/cron/records, /cron/media, /cron/records
router.use("/api/cron", cronRoutes);
router.use("/cron", cronRoutes);

// Root informational endpoint
router.get("/", (_req: Request, res: Response) => {
  res.status(200).json({
    service: "adv-oly-chowdhury-express",
    description: "Production Standalone Cron Cleanup Server",
    status: "running",
    endpoints: {
      health: "GET /health",
      readiness: "GET /ready",
      mediaCleanup: "GET/POST /api/cron/media?limit=50",
      recordsCleanup: "GET/POST /api/cron/records?limit=50",
    },
    authentication:
      "Authorization: Bearer <CRON_SECRET> or x-cron-secret: <CRON_SECRET>",
  });
});

export default router;
