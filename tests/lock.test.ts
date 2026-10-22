import { acquireCronLock, resetProcessLocks } from "../src/utils/lock.util";

describe("Distributed & In-Process Cron Lock (acquireCronLock)", () => {
  beforeEach(() => {
    resetProcessLocks();
  });

  afterEach(() => {
    resetProcessLocks();
  });

  it("should acquire an exclusive lock when no other job is executing", async () => {
    const lock = await acquireCronLock("test-job", 10);
    expect(lock.acquired).toBe(true);
    await lock.release();
  });

  it("should reject concurrent lock acquisition for the same job name", async () => {
    const lock1 = await acquireCronLock("test-concurrent", 10);
    expect(lock1.acquired).toBe(true);

    const lock2 = await acquireCronLock("test-concurrent", 10);
    expect(lock2.acquired).toBe(false);

    await lock1.release();
  });

  it("should allow re-acquisition after release", async () => {
    const lock1 = await acquireCronLock("test-reacquire", 10);
    expect(lock1.acquired).toBe(true);
    await lock1.release();

    const lock2 = await acquireCronLock("test-reacquire", 10);
    expect(lock2.acquired).toBe(true);
    await lock2.release();
  });

  it("should permit concurrent locks for distinct job names", async () => {
    const lockMedia = await acquireCronLock("media", 10);
    const lockRecords = await acquireCronLock("records", 10);

    expect(lockMedia.acquired).toBe(true);
    expect(lockRecords.acquired).toBe(true);

    await lockMedia.release();
    await lockRecords.release();
  });
});
