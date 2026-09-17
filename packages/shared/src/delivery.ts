import { z } from "zod";
import { CUTOFF_CYCLES, CUTOFF_HOUR_ET, CUTOFF_MINUTE_ET, TIMEZONE_ET } from "./constants";

/**
 * Cutoff/delivery engine responses.
 */
export const deliveryResponseSchema = z
  .object({
    timezone: z.literal("America/New_York"),
    currentEt: z.string(), // ISO timestamp
    cutoffAtEt: z.string(), // ISO timestamp — next 9:00 PM ET
    cutoffInMs: z.number().int().nonnegative(),
    guaranteedDeliveryDate: z.string(), // YYYY-MM-DD
    guaranteedDeliveryDow: z.string(), // "Monday" | ...
    guaranteedDeliveryLocal: z.string(), // "12:00 PM"
    cycleIndex: z.number().int().min(0).max(5),
  })
  .strict();

export type DeliveryResponse = z.infer<typeof deliveryResponseSchema>;

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * `date` as Eastern wall-clock time, expressed in a UTC-based frame
 * (so the result never depends on the machine's own timezone).
 */
function etWallClock(date: Date): { wallMs: number; dow: number } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: TIMEZONE_ET,
      hourCycle: "h23",
      weekday: "short",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
  );
  const wallMs = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return { wallMs, dow: WEEKDAYS.indexOf(parts.weekday!) };
}

/**
 * The next 9:00 PM ET order cutoff and its guaranteed delivery day, from the
 * six CUTOFF_CYCLES. The single implementation behind the API, the mock API
 * and the storefront's offline countdown.
 */
export function computeNextCutoff(now: Date = new Date()): DeliveryResponse {
  const { wallMs, dow } = etWallClock(now);
  const midnight = wallMs - (wallMs % DAY_MS);
  const cutoffOffset = (CUTOFF_HOUR_ET * 60 + CUTOFF_MINUTE_ET) * 60_000;

  // Next daily cutoff; Fri and Sat have none, so those roll to Sunday's.
  let cutoffWall = midnight + cutoffOffset;
  let cutoffDow = dow;
  while (cutoffWall <= wallMs || cutoffDow === 5 || cutoffDow === 6) {
    cutoffWall += DAY_MS;
    cutoffDow = (cutoffDow + 1) % 7;
  }

  // Monday's cutoff closes two cycles that share a delivery day; the rest map one-to-one.
  const afterSundayCutoff = dow === 0 && cutoffDow === 1;
  const cycle = CUTOFF_CYCLES.find((c) =>
    cutoffDow === 1 ? c.index === (afterSundayCutoff ? 5 : 0) : c.endDow === cutoffDow,
  )!;

  const daysToDelivery = (cycle.deliveryDow - cutoffDow + 7) % 7 || 7;
  const deliveryWall = cutoffWall - cutoffOffset + daysToDelivery * DAY_MS;
  const cutoffInMs = cutoffWall - wallMs;

  return {
    timezone: TIMEZONE_ET,
    currentEt: now.toISOString(),
    cutoffAtEt: new Date(now.getTime() + cutoffInMs).toISOString(),
    cutoffInMs,
    guaranteedDeliveryDate: new Date(deliveryWall).toISOString().slice(0, 10),
    guaranteedDeliveryDow: cycle.deliveryLabel,
    guaranteedDeliveryLocal: "12:00 PM",
    cycleIndex: cycle.index,
  };
}
