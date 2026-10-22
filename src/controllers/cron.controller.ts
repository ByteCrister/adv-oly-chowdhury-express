import { Request, Response, NextFunction } from "express";
import { executeMediaCleanup } from "../services/media-cleanup.service";
import { executeRecordsCleanup } from "../services/records-cleanup.service";
import { acquireCronLock } from "../utils/lock.util";
import { cronQuerySchema } from "../validators/cron.validator";
import { CRON_LOCK_NAMES, CRON_DEFAULTS } from "../constants/cron.const";

/**
 * Controller handling /api/cron/media endpoint executions.
 */
export async function cleanupMediaController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const query = cronQuerySchema.safeParse(req.query);
  const limit = query.success ? query.data.limit : CRON_DEFAULTS.DEFAULT_BATCH_LIMIT;

  const lock = await acquireCronLock(
    CRON_LOCK_NAMES.MEDIA,
    CRON_DEFAULTS.DEFAULT_LOCK_TTL_SECONDS
  );

  if (!lock.acquired) {
    res.status(409).json({
      success: false,
      message:
        "Conflict: Another media assets cleanup job is currently executing.",
      skipped: true,
    });
    return;
  }

  try {
    const result = await executeMediaCleanup(limit, req);

    const totalFailed = result.references.failed + result.assets.failed;
    const isHardFailure =
      totalFailed > 0 &&
      result.references.deleted === 0 &&
      result.assets.deleted === 0;

    res.status(isHardFailure ? 500 : 200).json(result);
  } catch (err) {
    next(err);
  } finally {
    await lock.release();
  }
}

/**
 * Controller handling /api/cron/records endpoint executions.
 */
export async function cleanupRecordsController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const query = cronQuerySchema.safeParse(req.query);
  const limit = query.success ? query.data.limit : CRON_DEFAULTS.DEFAULT_BATCH_LIMIT;

  const lock = await acquireCronLock(
    CRON_LOCK_NAMES.RECORDS,
    CRON_DEFAULTS.DEFAULT_LOCK_TTL_SECONDS
  );

  if (!lock.acquired) {
    res.status(409).json({
      success: false,
      message:
        "Conflict: Another database records cleanup job is currently executing.",
      skipped: true,
    });
    return;
  }

  try {
    const result = await executeRecordsCleanup(limit, req);

    const isHardFailure = result.totalFailed > 0 && result.totalDeleted === 0;

    res.status(isHardFailure ? 500 : 200).json(result);
  } catch (err) {
    next(err);
  } finally {
    await lock.release();
  }
}
