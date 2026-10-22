import { Request, Response } from "express";
import { authenticateCron } from "../src/middleware/authenticate-cron";

describe("Cron Authentication Middleware (authenticateCron)", () => {
  const originalSecret = process.env.CRON_SECRET;
  const mockSecret = "valid_cron_secret_for_unit_tests_1234";

  beforeAll(() => {
    process.env.CRON_SECRET = mockSecret;
  });

  afterAll(() => {
    process.env.CRON_SECRET = originalSecret;
  });

  function createMockContext(headers: Record<string, string | string[] | undefined>) {
    const req = {
      headers,
    } as unknown as Request;

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    } as unknown as Response;

    const next = jest.fn();

    return { req, res, next };
  }

  it("should succeed with valid Authorization: Bearer <secret>", () => {
    const { req, res, next } = createMockContext({
      authorization: `Bearer ${mockSecret}`,
    });

    authenticateCron(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it("should succeed with valid x-cron-secret header", () => {
    const { req, res, next } = createMockContext({
      "x-cron-secret": mockSecret,
    });

    authenticateCron(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it("should return 401 when no secret header is provided", () => {
    const { req, res, next } = createMockContext({});

    authenticateCron(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: expect.stringContaining("Missing cron secret credentials"),
      })
    );
  });

  it("should return 401 when invalid secret is provided", () => {
    const { req, res, next } = createMockContext({
      authorization: "Bearer wrong_secret_key_value_9876",
    });

    authenticateCron(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Unauthorized: Invalid cron secret credentials.",
    });
  });

  it("should return 500 if CRON_SECRET is empty on server", () => {
    process.env.CRON_SECRET = "";

    const { req, res, next } = createMockContext({
      authorization: `Bearer ${mockSecret}`,
    });

    authenticateCron(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);

    // Restore for other tests
    process.env.CRON_SECRET = mockSecret;
  });
});
