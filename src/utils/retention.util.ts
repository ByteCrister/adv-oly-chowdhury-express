/**
 * Calculates the exact cutoff timestamp for one calendar month ago.
 *
 * Requirements & Semantics:
 * 1. Operates strictly in UTC to prevent daylight-saving and timezone discrepancies.
 * 2. Month-end clamping: If the current day exceeds the maximum days in the target previous
 *    month (e.g., March 31 going back to February in a non-leap year), it clamps to the last
 *    valid day of that month (February 28th), avoiding the JavaScript setMonth overflow bug.
 * 3. Preserves exact time-of-day precision (hours, minutes, seconds, milliseconds).
 *
 * @param now - Reference date, defaults to current time
 * @returns Date representing exactly one calendar month before reference date
 */
export function getOneMonthRetentionCutoff(now: Date = new Date()): Date {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth(); // 0 to 11
  const day = now.getUTCDate();
  const hours = now.getUTCHours();
  const minutes = now.getUTCMinutes();
  const seconds = now.getUTCSeconds();
  const ms = now.getUTCMilliseconds();

  // Determine previous calendar month and year
  const targetYear = month === 0 ? year - 1 : year;
  const targetMonth = month === 0 ? 11 : month - 1;

  // Determine maximum days in target month (day 0 of targetMonth + 1 gives last day of targetMonth)
  const maxDaysInTargetMonth = new Date(
    Date.UTC(targetYear, targetMonth + 1, 0)
  ).getUTCDate();

  // Clamp day if necessary (e.g. 31st clamped to 28th/29th/30th)
  const clampedDay = Math.min(day, maxDaysInTargetMonth);

  return new Date(
    Date.UTC(targetYear, targetMonth, clampedDay, hours, minutes, seconds, ms)
  );
}
