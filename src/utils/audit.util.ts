import { Request } from "express";
import { Types } from "mongoose";
import { AuditLog } from "../models/AuditLog.model";
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from "../constants/audit-log.const";
import type { AuditRequestMeta, RecordAuditLogParams } from "../types/audit.types";

/**
 * Sensitive fields that must NEVER be persisted in audit logs.
 */
const SENSITIVE_FIELDS = new Set([
  "password",
  "passwordHash",
  "currentPassword",
  "newPassword",
  "confirmPassword",
  "token",
  "secret",
  "refreshToken",
  "accessToken",
  "salt",
]);

/**
 * Extracts client IP address and User Agent string from an incoming Express request.
 */
export function extractAuditReqMeta(req?: Request | null): AuditRequestMeta {
  if (!req) {
    return { ipAddress: null, userAgent: null };
  }

  let ipAddress: string | null = null;
  const forwardedFor = req.headers["x-forwarded-for"];

  if (typeof forwardedFor === "string") {
    ipAddress = forwardedFor.split(",")[0]?.trim() ?? null;
  } else if (Array.isArray(forwardedFor) && forwardedFor[0]) {
    ipAddress = forwardedFor[0].trim();
  } else if (typeof req.headers["x-real-ip"] === "string") {
    ipAddress = req.headers["x-real-ip"].trim();
  } else if (typeof req.ip === "string") {
    ipAddress = req.ip;
  }

  const userAgent = (req.headers["user-agent"] as string) || null;

  return { ipAddress, userAgent };
}

/**
 * Normalizes values to plain JavaScript objects and strips sensitive credentials.
 */
export function sanitizeAuditPayload(value: unknown): unknown {
  if (value === null || value === undefined) {
    return null;
  }

  // Handle Mongoose Document
  if (
    typeof value === "object" &&
    value !== null &&
    "toObject" in value &&
    typeof (value as { toObject: unknown }).toObject === "function"
  ) {
    return sanitizeAuditPayload(
      (value as { toObject: (opts?: unknown) => Record<string, unknown> }).toObject({
        depopulate: true,
      })
    );
  }

  // Handle MongoDB ObjectId
  if (value instanceof Types.ObjectId) {
    return value.toString();
  }

  // Handle Date
  if (value instanceof Date) {
    return value.toISOString();
  }

  // Handle Arrays
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeAuditPayload(item));
  }

  // Handle Plain Objects
  if (typeof value === "object") {
    const sanitized: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      if (SENSITIVE_FIELDS.has(key)) {
        sanitized[key] = "[REDACTED]";
        continue;
      }
      sanitized[key] = sanitizeAuditPayload(val);
    }
    return sanitized;
  }

  return value;
}

/**
 * Core compliance audit logger. Persists an immutable audit log entry to MongoDB.
 *
 * Supports execution inside active Mongoose transactions.
 * Automatically sanitizes sensitive payloads and resolves client IP/User-Agent.
 */
export async function recordAuditLog<
  TOld extends object = object,
  TNew extends object = object,
>(params: RecordAuditLogParams<TOld, TNew>) {
  const {
    req,
    userId: explicitUserId,
    action,
    entityType,
    entityId,
    oldValues,
    newValues,
    description,
    session,
  } = params;

  // Resolve user ID if provided
  let resolvedUserId: Types.ObjectId | null = null;
  if (explicitUserId) {
    resolvedUserId =
      explicitUserId instanceof Types.ObjectId
        ? explicitUserId
        : Types.ObjectId.isValid(explicitUserId)
        ? new Types.ObjectId(explicitUserId)
        : null;
  }

  // Resolve target entity ID
  const targetEntityId =
    entityId instanceof Types.ObjectId
      ? entityId
      : new Types.ObjectId(String(entityId));

  // Extract client metadata
  const { ipAddress, userAgent } = extractAuditReqMeta(req);

  // Sanitize state payloads
  const sanitizedOld = oldValues ? (sanitizeAuditPayload(oldValues) as Record<string, unknown>) : null;
  const sanitizedNew = newValues ? (sanitizeAuditPayload(newValues) as Record<string, unknown>) : null;

  const auditEntry = new AuditLog({
    userId: resolvedUserId,
    action,
    entityType,
    entityId: targetEntityId,
    oldValues: sanitizedOld,
    newValues: sanitizedNew,
    description: description || null,
    ipAddress,
    userAgent,
    createdAt: new Date(),
  });

  if (session) {
    await auditEntry.save({ session });
  } else {
    await auditEntry.save();
  }

  return auditEntry;
}

export { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES };
