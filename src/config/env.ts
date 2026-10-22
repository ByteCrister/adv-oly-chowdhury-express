import dotenv from "dotenv";
import { z } from "zod";

// Load environment variables from .env file
dotenv.config();

/**
 * Zod schema defining the configuration and validation rules
 * for the standalone Express cron cleanup server.
 */
export const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  PORT: z.coerce
    .number()
    .int("PORT must be an integer")
    .positive("PORT must be a positive integer")
    .default(5000),

  CORS_ORIGIN: z.string().default("*"),

  // Database Connection (MongoDB)
  MONGODB_URI: z
    .string({ required_error: "MONGODB_URI is required" })
    .min(1, "MONGODB_URI cannot be empty"),

  // Dedicated Cron Execution Secret (Constant-time verification)
  CRON_SECRET: z
    .string({ required_error: "CRON_SECRET is required" })
    .min(16, "CRON_SECRET must be at least 16 characters for security"),

  // Cloudinary Storage (Resource destruction)
  CLOUDINARY_CLOUD_NAME: z
    .string({ required_error: "CLOUDINARY_CLOUD_NAME is required" })
    .min(1, "CLOUDINARY_CLOUD_NAME cannot be empty"),
  CLOUDINARY_API_KEY: z
    .string({ required_error: "CLOUDINARY_API_KEY is required" })
    .min(1, "CLOUDINARY_API_KEY cannot be empty"),
  CLOUDINARY_API_SECRET: z
    .string({ required_error: "CLOUDINARY_API_SECRET is required" })
    .min(1, "CLOUDINARY_API_SECRET cannot be empty"),
  CLOUDINARY_FOLDER_NAME: z
    .string()
    .default("adv-oly-chowdhury"),

  // Distributed Lock Store (Optional Upstash Redis)
  UPSTASH_REDIS_REST_URL: z
    .string()
    .url("UPSTASH_REDIS_REST_URL must be a valid URL")
    .optional()
    .or(z.literal("")),
  UPSTASH_REDIS_REST_TOKEN: z
    .string()
    .optional()
    .or(z.literal("")),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Validates an environment dictionary against the schema.
 * Formats errors clearly without printing raw secret values.
 */
export function validateEnv(source: Record<string, unknown> = process.env): Env {
  const result = envSchema.safeParse(source);

  if (!result.success) {
    const fieldErrors = result.error.flatten().fieldErrors;
    const formattedErrors = Object.entries(fieldErrors)
      .map(([field, errors]) => `  - ${field}: ${errors?.join(", ")}`)
      .join("\n");

    const message = `\n❌ [ENV VALIDATION ERROR] Invalid environment configuration:\n${formattedErrors}\n`;
    
    // In test environment, throw error directly for test assertions
    if (source.NODE_ENV === "test" || process.env.NODE_ENV === "test") {
      throw new Error(`Environment validation failed:\n${formattedErrors}`);
    }

    console.error(message);
    throw new Error("Invalid or missing environment variables. Please check your .env file.");
  }

  return Object.freeze(result.data);
}

// In test mode, allow tests to control env or provide test defaults if not loaded
let currentEnv: Env;
try {
  currentEnv = validateEnv(process.env);
} catch (err) {
  if (process.env.NODE_ENV === "test") {
    // Provide safe dummy test values during test import if .env is unset
    currentEnv = Object.freeze({
      NODE_ENV: "test",
      PORT: 5001,
      CORS_ORIGIN: "*",
      MONGODB_URI: "mongodb://127.0.0.1:27017/test_chamber_db",
      CRON_SECRET: "test_secret_must_be_at_least_16_characters_long",
      CLOUDINARY_CLOUD_NAME: "test_cloud",
      CLOUDINARY_API_KEY: "test_key",
      CLOUDINARY_API_SECRET: "test_secret",
      CLOUDINARY_FOLDER_NAME: "test_folder",
    });
  } else {
    throw err;
  }
}

export const env = currentEnv;
export default env;
