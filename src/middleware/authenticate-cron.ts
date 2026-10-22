import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import env from "../config/env";

/**
 * Middleware that authenticates cron requests against the configured CRON_SECRET.
 *
 * Supports two established header formats:
 * 1. Authorization: Bearer <secret>
 * 2. x-cron-secret: <secret>
 *
 * Employs constant-time SHA-256 digest comparison using crypto.timingSafeEqual
 * to eliminate timing-attack vulnerabilities and prevent secret leakage.
 */
export function authenticateCron(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const configuredSecret =
    process.env.CRON_SECRET !== undefined
      ? process.env.CRON_SECRET
      : env.CRON_SECRET;

  if (!configuredSecret || configuredSecret.trim().length === 0) {
    console.error(
      "❌ [CRON AUTH ERROR] CRON_SECRET environment variable is not configured on the server."
    );
    res.status(500).json({
      success: false,
      message:
        "Server configuration error: CRON_SECRET is not configured on the server.",
    });
    return;
  }

  // Extract secret from Authorization header or custom x-cron-secret header
  let providedSecret = "";
  const authHeader = req.headers["authorization"];
  const customHeader = req.headers["x-cron-secret"];

  if (typeof authHeader === "string" && authHeader.toLowerCase().startsWith("bearer ")) {
    providedSecret = authHeader.substring(7).trim();
  } else if (typeof customHeader === "string") {
    providedSecret = customHeader.trim();
  } else if (Array.isArray(customHeader) && customHeader[0]) {
    providedSecret = customHeader[0].trim();
  }

  if (!providedSecret) {
    res.status(401).json({
      success: false,
      message:
        "Unauthorized: Missing cron secret credentials. Provide 'Authorization: Bearer <token>' or 'x-cron-secret' header.",
    });
    return;
  }

  // Constant-time comparison by hashing both to fixed-length 32-byte SHA-256 buffers
  const expectedHash = crypto
    .createHash("sha256")
    .update(configuredSecret)
    .digest();
  const providedHash = crypto
    .createHash("sha256")
    .update(providedSecret)
    .digest();

  const isMatch = crypto.timingSafeEqual(expectedHash, providedHash);

  if (!isMatch) {
    res.status(401).json({
      success: false,
      message: "Unauthorized: Invalid cron secret credentials.",
    });
    return;
  }

  next();
}

export default authenticateCron;
