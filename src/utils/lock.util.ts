import crypto from "crypto";
import redis, { isRedisConfigured } from "../config/redis";
import type { CronLockResult } from "../types/cron.types";
import { CRON_DEFAULTS } from "../constants/cron.const";

// In-process fallback lock store when Redis is unavailable or unconfigured
const processLocks = new Map<string, { timer: NodeJS.Timeout; value: string }>();

/**
 * Attempts to acquire an exclusive lock for a cron cleanup execution.
 *
 * When Upstash Redis is configured, uses a distributed NX/EX lease lock with auto-expiration.
 * When Redis is unavailable or unconfigured, falls back to in-process memory mutual exclusion.
 *
 * @param lockName - Unique identifier for the job (e.g., 'records', 'media')
 * @param ttlSeconds - Lease expiration time in seconds (default: 300s / 5 minutes)
 */
export async function acquireCronLock(
  lockName: string,
  ttlSeconds: number = CRON_DEFAULTS.DEFAULT_LOCK_TTL_SECONDS
): Promise<CronLockResult> {
  const lockKey = `cron:lock:${lockName}`;
  const lockValue = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}`;

  if (isRedisConfigured && redis) {
    const client = redis;
    try {
      const acquired = await client.set(lockKey, lockValue, {
        nx: true,
        ex: ttlSeconds,
      });

      if (!acquired) {
        return {
          acquired: false,
          release: async () => {},
        };
      }

      return {
        acquired: true,
        release: async () => {
          try {
            // Safely release lock only if the value still matches our lease
            const currentValue = await client.get<string>(lockKey);
            if (currentValue === lockValue) {
              await client.del(lockKey);
            }
          } catch (err) {
            console.error(`[CRON LOCK] Error releasing Redis lock for ${lockName}:`, err);
          }
        },
      };
    } catch (err) {
      console.warn(
        `[CRON LOCK] Upstash Redis error while acquiring lock for ${lockName}. Falling back to process lock:`,
        err
      );
    }
  }

  // Process-level fallback
  if (processLocks.has(lockName)) {
    return {
      acquired: false,
      release: async () => {},
    };
  }

  // Auto-expire fallback after ttlSeconds
  const timer = setTimeout(() => {
    processLocks.delete(lockName);
  }, ttlSeconds * 1000);

  processLocks.set(lockName, { timer, value: lockValue });

  return {
    acquired: true,
    release: async () => {
      const existing = processLocks.get(lockName);
      if (existing) {
        clearTimeout(existing.timer);
        processLocks.delete(lockName);
      }
    },
  };
}

/**
 * Helper primarily for testing: clears all active in-process locks.
 */
export function resetProcessLocks(): void {
  for (const [, lock] of processLocks) {
    clearTimeout(lock.timer);
  }
  processLocks.clear();
}
