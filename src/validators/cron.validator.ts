import { z } from "zod";
import { CRON_DEFAULTS } from "../constants/cron.const";

export const cronQuerySchema = z.object({
  limit: z.coerce
    .number()
    .int("Limit must be an integer")
    .positive("Limit must be a positive integer")
    .max(
      CRON_DEFAULTS.MAX_BATCH_LIMIT,
      `Limit cannot exceed ${CRON_DEFAULTS.MAX_BATCH_LIMIT}`
    )
    .default(CRON_DEFAULTS.DEFAULT_BATCH_LIMIT),
});

export type CronQueryParams = z.infer<typeof cronQuerySchema>;
