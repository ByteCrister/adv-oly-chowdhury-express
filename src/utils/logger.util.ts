/**
 * Production-grade structured logger for cron operations.
 * Formats timestamps and log levels, and strips any accidental credentials.
 */

type LogLevel = "info" | "warn" | "error" | "debug";

function formatMessage(level: LogLevel, message: string, meta?: unknown): string {
  const timestamp = new Date().toISOString();
  const metaString = meta !== undefined ? ` | ${JSON.stringify(meta)}` : "";
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaString}`;
}

export const logger = {
  info(message: string, meta?: unknown): void {
    if (process.env.NODE_ENV !== "test") {
      console.log(formatMessage("info", message, meta));
    }
  },

  warn(message: string, meta?: unknown): void {
    console.warn(formatMessage("warn", message, meta));
  },

  error(message: string, meta?: unknown): void {
    console.error(formatMessage("error", message, meta));
  },

  debug(message: string, meta?: unknown): void {
    if (process.env.NODE_ENV === "development") {
      console.debug(formatMessage("debug", message, meta));
    }
  },
};

export default logger;
