/**
 * Client-side countdown fallback — computes the next 9:00 PM ET cutoff
 * without requiring the backend API. Mirrors the logic from demo.js but
 * as a proper TypeScript module for the Next.js frontend.
 */

export interface CutoffResult {
  /** Timestamp of the next 9:00 PM ET cutoff (epoch ms) */
  cutoffAtMs: number;
  /** Remaining milliseconds until the next cutoff */
  remainingMs: number;
  /** Guaranteed delivery day of week (e.g. "Wednesday") */
  deliveryDow: string;
}

/**
 * Extract date parts for a given Date in the America/New_York timezone.
 */
function getEtParts(date: Date): Record<string, string> {
  return Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "short",
    })
      .formatToParts(date)
      .filter((p) => p.type !== "literal")
      .map((p) => [p.type, p.value]),
  );
}

/**
 * Get the offset in minutes for America/New_York at a given date.
 */
function getEtOffsetMinutes(date: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    timeZoneName: "shortOffset",
    hour: "2-digit",
  }).formatToParts(date);

  const tzPart = parts.find((p) => p.type === "timeZoneName")?.value ?? "";
  const match = tzPart.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  if (match) {
    const sign = match[1] === "+" ? 1 : -1;
    const hours = Number(match[2]);
    const minutes = Number(match[3] || 0);
    return sign * (hours * 60 + minutes);
  }

  // Fallback: determine EST vs EDT by checking if we're in standard time
  // Standard ET = UTC-5 (-300 min), Daylight ET = UTC-4 (-240 min)
  // This fallback uses the US DST rule: 2nd Sunday of March to 1st Sunday of November
  const etNow = getEtParts(date);
  const month = Number(etNow.month);
  const day = Number(etNow.day);

  // Crude heuristic: Mar-Nov is EDT, Nov-Mar is EST
  // For the transition months, we'd need more precision, but this is a fallback
  if (month >= 3 && month <= 10) return -240; // EDT
  if (month === 11 && day <= 3) return -240; // Early Nov still EDT
  return -300; // EST
}

/**
 * Convert ET date parts + hour to a UTC Date.
 */
function etDateToUtc(parts: Record<string, string>, hour: number): Date {
  const offset = getEtOffsetMinutes(new Date(Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    hour,
  )));
  return new Date(Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    hour,
  ) - offset * 60000);
}

/**
 * Add business days to ET date parts, respecting the delivery day map.
 */
function addEtDays(parts: Record<string, string>, days: number): Record<string, string> {
  const base = new Date(Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day) + days,
    12,
  ));
  return getEtParts(base);
}

/**
 * Compute the delivery day of week based on cutoff day.
 */
function deliveryDayFromCutoff(cutoffParts: Record<string, string>): string {
  const map: Record<string, number> = {
    Mon: 2,
    Tue: 2,
    Wed: 2,
    Thu: 4,
    Fri: 4,
    Sat: 3,
    Sun: 2,
  };
  const deliveryParts = addEtDays(cutoffParts, map[cutoffParts.weekday] ?? 2);
  return new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(
    new Date(Date.UTC(
      Number(deliveryParts.year),
      Number(deliveryParts.month) - 1,
      Number(deliveryParts.day),
      12,
    )),
  );
}

/**
 * Compute the next 9:00 PM ET cutoff and delivery info.
 * Pure client-side — no API dependency.
 */
export function getNextCutoffFallback(now: Date = new Date()): CutoffResult {
  const todayEt = getEtParts(now);
  let target = etDateToUtc(todayEt, 21); // 9 PM = 21:00
  let targetParts = todayEt;

  // If today's 9 PM has already passed, use tomorrow's 9 PM
  if (target.getTime() <= now.getTime()) {
    targetParts = addEtDays(todayEt, 1);
    target = etDateToUtc(targetParts, 21);
  }

  return {
    cutoffAtMs: target.getTime(),
    remainingMs: Math.max(0, target.getTime() - now.getTime()),
    deliveryDow: deliveryDayFromCutoff(targetParts),
  };
}