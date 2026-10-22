import { Redis } from "@upstash/redis";
import env from "./env";

/**
 * Determines whether valid Upstash Redis credentials have been provided.
 */
export const isRedisConfigured: boolean = Boolean(
  env.UPSTASH_REDIS_REST_URL &&
  env.UPSTASH_REDIS_REST_TOKEN &&
  !env.UPSTASH_REDIS_REST_URL.includes("your-upstash-redis") &&
  !env.UPSTASH_REDIS_REST_TOKEN.includes("your_upstash_redis")
);

/**
 * Initialized Upstash Redis client instance, or null if unconfigured.
 */
export const redis: Redis | null = isRedisConfigured
  ? new Redis({
      url: env.UPSTASH_REDIS_REST_URL!,
      token: env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null;

export default redis;
