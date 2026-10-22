/**
 * Cron Job Configuration and Boundary Constants
 */

export const CRON_DEFAULTS = {
  DEFAULT_BATCH_LIMIT: 50,
  MAX_BATCH_LIMIT: 100,
  DEFAULT_LOCK_TTL_SECONDS: 300, // 5 minutes
} as const;

export const CRON_LOCK_NAMES = {
  MEDIA: "media",
  RECORDS: "records",
} as const;

export const CRON_JOB_NAMES = {
  MEDIA_CLEANUP: "cleanup-orphaned-media",
  RECORDS_CLEANUP: "cleanup-soft-deleted-records",
} as const;
