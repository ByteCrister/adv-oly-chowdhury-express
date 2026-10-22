import { Router } from "express";
import {
  cleanupMediaController,
  cleanupRecordsController,
} from "../controllers/cron.controller";
import { authenticateCron } from "../middleware/authenticate-cron";

const router = Router();

// Secure all cron routes with timing-safe authentication middleware
router.use(authenticateCron);

/**
 * GET & POST /media
 * Triggers physical media asset and reference cleanup.
 */
router.get("/media", cleanupMediaController);
router.post("/media", cleanupMediaController);

/**
 * GET & POST /records
 * Triggers soft-deleted database record cleanup in strict topological order.
 */
router.get("/records", cleanupRecordsController);
router.post("/records", cleanupRecordsController);

export default router;
