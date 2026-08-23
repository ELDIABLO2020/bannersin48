/**
 * 48-business-hour promise helpers. A "business hour" advances only on
 * weekdays (Mon–Fri); weekend wall-clock time is skipped entirely.
 * Deliberately simple — no per-day opening hours.
 */

const HOUR_MS = 60 * 60 * 1000;

export function addBusinessHours(start: Date, hours: number): Date {
  let cursor = start.getTime();
  let remaining = hours * HOUR_MS;
  while (remaining > 0) {
    const candidate = new Date(cursor + Math.min(HOUR_MS, remaining));
    const dow = candidate.getUTCDay();
    if (dow !== 0 && dow !== 6) {
      remaining -= candidate.getTime() - cursor;
    }
    cursor += HOUR_MS;
  }
  return new Date(cursor);
}

export function slaDeadline(placedAt: Date): Date {
  return addBusinessHours(placedAt, 48);
}

export function isSlaBreached(placedAt: Date, now: Date = new Date()): boolean {
  return slaDeadline(placedAt).getTime() < now.getTime();
}
