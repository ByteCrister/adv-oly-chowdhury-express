import { Request, Response } from "express";

/**
 * 404 Not Found middleware for unmatched routes.
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    message: `Cannot ${req.method} ${req.originalUrl}`,
  });
}

export default notFoundHandler;
