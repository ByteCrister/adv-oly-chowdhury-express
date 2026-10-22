/**
 * Custom error class for API operations.
 * Allows throwing typed HTTP errors that centralized error-handling middleware
 * will catch and format into standardized JSON responses.
 */
export class ApiError extends Error {
  public readonly status: number;
  public readonly details?: unknown;

  constructor(message: string, status = 500, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  static badRequest(message = "Bad Request", details?: unknown): ApiError {
    return new ApiError(message, 400, details);
  }

  static unauthorized(message = "Unauthorized", details?: unknown): ApiError {
    return new ApiError(message, 401, details);
  }

  static forbidden(message = "Forbidden", details?: unknown): ApiError {
    return new ApiError(message, 403, details);
  }

  static notFound(message = "Resource not found", details?: unknown): ApiError {
    return new ApiError(message, 404, details);
  }

  static conflict(message = "Conflict", details?: unknown): ApiError {
    return new ApiError(message, 409, details);
  }

  static internal(message = "Internal Server Error", details?: unknown): ApiError {
    return new ApiError(message, 500, details);
  }
}

export default ApiError;
