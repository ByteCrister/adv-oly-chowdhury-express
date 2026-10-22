import express, { Express } from "express";
import helmet from "helmet";
import cors from "cors";
import env from "./config/env";
import routes from "./routes";
import { errorHandler } from "./middleware/error-handler";
import { notFoundHandler } from "./middleware/not-found";
import { requestLogger } from "./middleware/request-logger";

/**
 * Creates and configures the Express application.
 * Isolated from server port listening to facilitate clean integration testing.
 */
export function createApp(): Express {
  const app = express();

  // Security Headers
  app.use(helmet());

  // CORS Configuration
  app.use(
    cors({
      origin: env.CORS_ORIGIN === "*" ? true : env.CORS_ORIGIN,
      methods: ["GET", "POST", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "x-cron-secret"],
    })
  );

  // Request Body Parsers with conservative bounded payload limits
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));

  // Safe Request Logging
  app.use(requestLogger);

  // Main Routes
  app.use("/", routes);

  // 404 Unmatched Route Handler
  app.use(notFoundHandler);

  // Centralized Error Handling Middleware
  app.use(errorHandler);

  return app;
}

export const app = createApp();
export default app;
