import { validateEnv } from "../src/config/env";

describe("Environment Configuration & Validation", () => {
  const validConfig = {
    NODE_ENV: "test",
    PORT: "5000",
    MONGODB_URI: "mongodb://127.0.0.1:27017/test_chamber_db",
    CRON_SECRET: "super_secure_random_cron_secret_key_12345",
    CLOUDINARY_CLOUD_NAME: "demo_cloud",
    CLOUDINARY_API_KEY: "123456789012345",
    CLOUDINARY_API_SECRET: "abcdef1234567890",
    CLOUDINARY_FOLDER_NAME: "adv-oly-chowdhury",
  };

  it("should successfully parse a valid environment configuration", () => {
    const env = validateEnv(validConfig);
    expect(env.NODE_ENV).toBe("test");
    expect(env.PORT).toBe(5000);
    expect(env.MONGODB_URI).toBe("mongodb://127.0.0.1:27017/test_chamber_db");
    expect(env.CRON_SECRET).toBe("super_secure_random_cron_secret_key_12345");
  });

  it("should fail when MONGODB_URI is missing", () => {
    const { MONGODB_URI, ...invalid } = validConfig;
    expect(() => validateEnv(invalid)).toThrow(/MONGODB_URI is required/);
  });

  it("should fail when CRON_SECRET is missing", () => {
    const { CRON_SECRET, ...invalid } = validConfig;
    expect(() => validateEnv(invalid)).toThrow(/CRON_SECRET is required/);
  });

  it("should fail when CRON_SECRET is shorter than 16 characters", () => {
    const invalid = { ...validConfig, CRON_SECRET: "too_short" };
    expect(() => validateEnv(invalid)).toThrow(/at least 16 characters/);
  });

  it("should fail when Cloudinary credentials are missing", () => {
    const { CLOUDINARY_CLOUD_NAME, ...invalid } = validConfig;
    expect(() => validateEnv(invalid)).toThrow(/CLOUDINARY_CLOUD_NAME is required/);
  });

  it("should fail when UPSTASH_REDIS_REST_URL is not a valid URL", () => {
    const invalid = {
      ...validConfig,
      UPSTASH_REDIS_REST_URL: "not-a-valid-url",
    };
    expect(() => validateEnv(invalid)).toThrow(/must be a valid URL/);
  });

  it("should never leak secret values in error messages", () => {
    try {
      validateEnv({
        ...validConfig,
        PORT: "invalid_port",
        CRON_SECRET: "short",
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      expect(message).not.toContain("super_secure_random_cron_secret_key_12345");
    }
  });
});
