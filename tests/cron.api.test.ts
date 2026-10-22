import request from "supertest";
import app from "../src/app";
import * as mediaCleanupService from "../src/services/media-cleanup.service";
import * as recordsCleanupService from "../src/services/records-cleanup.service";
import * as lockUtil from "../src/utils/lock.util";
import type {
  CronMediaCleanupResponse,
  CronRecordsCleanupResponse,
} from "../src/types/cron.types";

describe("Cron Cleanup Express API Endpoints (Integration)", () => {
  const validSecret = "test_secret_must_be_at_least_16_characters_long";

  beforeAll(() => {
    process.env.CRON_SECRET = validSecret;
  });

  afterEach(() => {
    jest.restoreAllMocks();
    lockUtil.resetProcessLocks();
  });

  describe("Public Health & Informational Endpoints", () => {
    it("GET / should return service metadata", async () => {
      const res = await request(app).get("/");
      expect(res.status).toBe(200);
      expect(res.body.service).toBe("adv-oly-chowdhury-express");
      expect(res.body.status).toBe("running");
      expect(res.body.endpoints).toBeDefined();
    });

    it("GET /health should return 200 or 503 depending on db status", async () => {
      const res = await request(app).get("/health");
      expect([200, 503]).toContain(res.status);
      expect(res.body.timestamp).toBeDefined();
      expect(res.body.database).toBeDefined();
    });

    it("GET /unknown-route should return 404 Not Found", async () => {
      const res = await request(app).get("/api/unknown-route");
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe("Authentication Guards on Cron Routes", () => {
    it("GET /api/cron/media should reject unauthenticated requests with 401", async () => {
      const res = await request(app).get("/api/cron/media");
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("Missing cron secret");
    });

    it("POST /api/cron/media should reject invalid secret with 401", async () => {
      const res = await request(app)
        .post("/api/cron/media")
        .set("Authorization", "Bearer invalid_secret_token_here");
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("Invalid cron secret credentials");
    });

    it("GET /api/cron/records should reject unauthenticated requests with 401", async () => {
      const res = await request(app).get("/api/cron/records");
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe("Authorized Cron Job Execution", () => {
    it("GET /api/cron/media should execute media cleanup and return 200 with Bearer token", async () => {
      const mockResult: CronMediaCleanupResponse = {
        success: true,
        job: "cleanup-orphaned-media",
        retentionCutoff: new Date().toISOString(),
        processedAt: new Date().toISOString(),
        batchLimit: 50,
        references: { scanned: 2, eligible: 2, deleted: 2, skipped: 0, failed: 0 },
        assets: { retried: 0, orphansScanned: 1, eligible: 1, deleted: 1, skipped: 0, failed: 0 },
        totalPurgedFromCloudinary: 1,
        hasMore: false,
        message: "Media cleanup completed.",
      };

      jest.spyOn(mediaCleanupService, "executeMediaCleanup").mockResolvedValue(mockResult);

      const res = await request(app)
        .get("/api/cron/media?limit=50")
        .set("Authorization", `Bearer ${validSecret}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.job).toBe("cleanup-orphaned-media");
      expect(res.body.references.deleted).toBe(2);
      expect(res.body.assets.deleted).toBe(1);
    });

    it("POST /api/cron/records should execute records cleanup and return 200 with x-cron-secret header", async () => {
      const mockResult: CronRecordsCleanupResponse = {
        success: true,
        job: "cleanup-soft-deleted-records",
        retentionCutoff: new Date().toISOString(),
        processedAt: new Date().toISOString(),
        batchLimit: 50,
        counts: {
          tasks: { scanned: 1, eligible: 1, deleted: 1, skipped: 0, failed: 0 },
          caseDocuments: { scanned: 0, eligible: 0, deleted: 0, skipped: 0, failed: 0 },
          clientDocuments: { scanned: 0, eligible: 0, deleted: 0, skipped: 0, failed: 0 },
          cases: { scanned: 0, eligible: 0, deleted: 0, skipped: 0, failed: 0 },
          clients: { scanned: 0, eligible: 0, deleted: 0, skipped: 0, failed: 0 },
          courts: { scanned: 0, eligible: 0, deleted: 0, skipped: 0, failed: 0 },
        },
        totalScanned: 1,
        totalEligible: 1,
        totalDeleted: 1,
        totalSkipped: 0,
        totalFailed: 0,
        hasMore: false,
        message: "Database records cleanup completed.",
      };

      jest.spyOn(recordsCleanupService, "executeRecordsCleanup").mockResolvedValue(mockResult);

      const res = await request(app)
        .post("/api/cron/records")
        .set("x-cron-secret", validSecret);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.job).toBe("cleanup-soft-deleted-records");
      expect(res.body.totalDeleted).toBe(1);
    });

    it("should return 409 Conflict if another cleanup job is currently executing", async () => {
      // Hold the media lock intentionally
      const existingLock = await lockUtil.acquireCronLock("media", 300);
      expect(existingLock.acquired).toBe(true);

      const res = await request(app)
        .get("/api/cron/media")
        .set("Authorization", `Bearer ${validSecret}`);

      expect(res.status).toBe(409);
      expect(res.body.skipped).toBe(true);
      expect(res.body.message).toContain("Another media assets cleanup job is currently executing");

      await existingLock.release();
    });
  });
});
