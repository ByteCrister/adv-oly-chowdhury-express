import { Request, Response, NextFunction } from "express";

/**
 * Lightweight structured request logging middleware.
 * Never logs authentication tokens, headers, or request payloads.
 */
export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const start = Date.now();

  res.on("finish", () => {
    if (process.env.NODE_ENV !== "test") {
      const duration = Date.now() - start;
      const ip =
        req.headers["x-forwarded-for"] ||
        req.headers["x-real-ip"] ||
        req.ip ||
        "unknown";

      console.log(
        `[HTTP] ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms (IP: ${ip})`
      );
    }
  });

  next();
}

export default requestLogger;
