import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { ZodError } from "zod";
import { ApiError } from "../utils/api-error";

/**
 * Centralized production-grade Express error-handling middleware.
 * Formats known operational errors, validation errors, and unexpected exceptions
 * into consistent JSON responses.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  // 1. Typed ApiError
  if (err instanceof ApiError) {
    res.status(err.status).json({
      success: false,
      message: err.message,
      ...(err.details !== undefined ? { details: err.details } : {}),
    });
    return;
  }

  // 2. Zod validation error
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: err.flatten().fieldErrors,
    });
    return;
  }

  // 3. Mongoose Schema Validation error
  if (err instanceof mongoose.Error.ValidationError) {
    const errors: Record<string, string> = {};
    for (const [field, item] of Object.entries(err.errors)) {
      errors[field] = item.message;
    }
    res.status(400).json({
      success: false,
      message: "Validation failed",
      errors,
    });
    return;
  }

  // 4. Mongoose CastError (e.g. invalid ObjectId)
  if (err instanceof mongoose.Error.CastError) {
    res.status(400).json({
      success: false,
      message: `Invalid ${err.path}: ${String(err.value)}`,
    });
    return;
  }

  // 5. MongoDB Duplicate Key error (code 11000)
  if (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: number }).code === 11000
  ) {
    const mongoErr = err as { keyValue?: Record<string, unknown> };
    const field = mongoErr.keyValue ? Object.keys(mongoErr.keyValue)[0] : "field";
    res.status(409).json({
      success: false,
      message: `${field} already exists`,
    });
    return;
  }

  // 6. Generic JavaScript Error
  if (err instanceof Error) {
    console.error("❌ [UNHANDLED ERROR]:", err);
    res.status(500).json({
      success: false,
      message:
        process.env.NODE_ENV === "production"
          ? "Internal Server Error"
          : err.message,
    });
    return;
  }

  // 7. Unknown thrown value
  console.error("❌ [UNKNOWN THROWN VALUE]:", err);
  res.status(500).json({
    success: false,
    message: "An unexpected error occurred",
  });
}

export default errorHandler;
