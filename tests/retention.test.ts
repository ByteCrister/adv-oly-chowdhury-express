import { getOneMonthRetentionCutoff } from "../src/utils/retention.util";

describe("Retention Cutoff Utility (getOneMonthRetentionCutoff)", () => {
  it("should subtract exactly one calendar month in standard months", () => {
    // 2026-07-15T10:30:00.000Z -> 2026-06-15T10:30:00.000Z
    const refDate = new Date(Date.UTC(2026, 6, 15, 10, 30, 0, 0));
    const cutoff = getOneMonthRetentionCutoff(refDate);

    expect(cutoff.getUTCFullYear()).toBe(2026);
    expect(cutoff.getUTCMonth()).toBe(5); // June (0-indexed 5)
    expect(cutoff.getUTCDate()).toBe(15);
    expect(cutoff.getUTCHours()).toBe(10);
    expect(cutoff.getUTCMinutes()).toBe(30);
  });

  it("should wrap around to December of previous year in January", () => {
    // 2026-01-10T15:00:00.000Z -> 2025-12-10T15:00:00.000Z
    const refDate = new Date(Date.UTC(2026, 0, 10, 15, 0, 0, 0));
    const cutoff = getOneMonthRetentionCutoff(refDate);

    expect(cutoff.getUTCFullYear()).toBe(2025);
    expect(cutoff.getUTCMonth()).toBe(11); // December
    expect(cutoff.getUTCDate()).toBe(10);
  });

  it("should clamp month-end from March 31 to February 28 in non-leap year", () => {
    // 2025 is not a leap year -> March 31 clamps to Feb 28
    const refDate = new Date(Date.UTC(2025, 2, 31, 12, 0, 0, 0));
    const cutoff = getOneMonthRetentionCutoff(refDate);

    expect(cutoff.getUTCFullYear()).toBe(2025);
    expect(cutoff.getUTCMonth()).toBe(1); // February
    expect(cutoff.getUTCDate()).toBe(28);
  });

  it("should clamp month-end from March 31 to February 29 in leap year", () => {
    // 2024 is a leap year -> March 31 clamps to Feb 29
    const refDate = new Date(Date.UTC(2024, 2, 31, 12, 0, 0, 0));
    const cutoff = getOneMonthRetentionCutoff(refDate);

    expect(cutoff.getUTCFullYear()).toBe(2024);
    expect(cutoff.getUTCMonth()).toBe(1); // February
    expect(cutoff.getUTCDate()).toBe(29);
  });

  it("should clamp 31st to 30th for months with 30 days (e.g. May 31 to April 30)", () => {
    // May 31 -> April 30
    const refDate = new Date(Date.UTC(2026, 4, 31, 8, 0, 0, 0));
    const cutoff = getOneMonthRetentionCutoff(refDate);

    expect(cutoff.getUTCFullYear()).toBe(2026);
    expect(cutoff.getUTCMonth()).toBe(3); // April
    expect(cutoff.getUTCDate()).toBe(30);
  });

  it("should preserve exact millisecond precision", () => {
    const refDate = new Date(Date.UTC(2026, 5, 20, 14, 22, 45, 789));
    const cutoff = getOneMonthRetentionCutoff(refDate);

    expect(cutoff.getUTCMilliseconds()).toBe(789);
    expect(cutoff.getUTCSeconds()).toBe(45);
    expect(cutoff.getUTCMinutes()).toBe(22);
    expect(cutoff.getUTCHours()).toBe(14);
  });
});
