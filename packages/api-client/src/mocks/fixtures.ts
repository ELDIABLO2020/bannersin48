/**
 * In-memory fixtures for the MSW mock backend.
 * Designed so the frontend can develop, screenshot, and E2E-test every screen
 * before the real NestJS backend ships.
 */

import {
  POPULAR_SIZES,
  CUTOFF_CYCLES,
  TIMEZONE_ET,
  CUTOFF_HOUR_ET,
  CUTOFF_MINUTE_ET,
  type CutoffCycleIndex,
  type Order,
  type OrderStatus,
  type DeliveryResponse,
  type PopularSize,
  type User,
} from "@bannersin48/shared";

export const fixtures = {
  popularSizes: POPULAR_SIZES as PopularSize[],
};

interface MockOrderRecord {
  order: Order;
  cancellationTimeoutId?: ReturnType<typeof setTimeout>;
}

class MockStore {
  users: Map<string, { user: User; password: string }> = new Map();
  userIdCounter = 1;
  artwork: Map<string, { id: string; filename: string; previewUrl: string; mime: string; size: number }> = new Map();
  artworkIdCounter = 1;
  orders: Map<string, MockOrderRecord> = new Map();
  orderIdCounter = 1;
  /**
   * In a real backend this is in Redis/BullMQ. For the MSW mock we use setTimeout
   * so E2E can shorten CANCELLATION_WINDOW_MS via env.
   */
  cancellationWindowMs(): number {
    // Read at call time so test overrides are picked up.
    const v = process?.env?.CANCELLATION_WINDOW_MS;
    if (v && !Number.isNaN(Number(v))) return Number(v);
    return 10 * 60 * 1000;
  }
}

export const store = new MockStore();

// Seed a demo user
store.users.set("demo@bannersin48.com", {
  user: {
    id: "user_demo",
    email: "demo@bannersin48.com",
    fullName: "Demo Customer",
    taxExempt: false,
    taxExemptApproved: false,
    rewardsPoints: 120,
    savedAddresses: [],
    createdAt: new Date().toISOString(),
  },
  password: "demo1234",
});

/**
 * Compute the next cutoff + delivery cycle from "now" in Eastern Time.
 * Mirrors the backend delivery engine logic.
 */
export function computeNextCutoff(now: Date = new Date()): DeliveryResponse {
  // Use the Intl timezone offset to derive ET local time
  const etString = now.toLocaleString("en-US", { timeZone: TIMEZONE_ET });
  const et = new Date(etString);
  const etDow = et.getDay(); // 0=Sun..6=Sat
  const etHour = et.getHours();
  const etMinute = et.getMinutes();

  // Find the next cycle whose start is in the future or whose end is in the future
  // Simplest: find the next 9:00 PM ET (today if before 9 PM, else tomorrow).
  const cutoffToday = new Date(et);
  cutoffToday.setHours(CUTOFF_HOUR_ET, CUTOFF_MINUTE_ET, 0, 0);
  const isBeforeCutoff = et < cutoffToday;

  // Pick a cycle index
  // cycles by start DOW/HH:MM
  function findCycle(startDow: number, startHour: number, startMinute: number, endDow: number, endHour: number, endMinute: number): CutoffCycleIndex | null {
    for (const c of CUTOFF_CYCLES) {
      if (
        c.startDow === startDow && c.startHourEt === startHour && c.startMinuteEt === startMinute &&
        c.endDow === endDow && c.endHourEt === endHour && c.endMinuteEt === endMinute
      ) return c.index;
    }
    return null;
  }

  let cycleIndex: CutoffCycleIndex = 0;
  if (isBeforeCutoff) {
    // Today's cutoff cycle — find by start=etDow, end=etDow, both = 9 PM
    const idx = findCycle(etDow, 0, 0, etDow, 21, 0);
    cycleIndex = (idx ?? 0) as CutoffCycleIndex;
  } else {
    // After 9 PM today — find the next day's morning-anchored cycle, or the weekend cycle
    const tomorrow = new Date(et);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDow = tomorrow.getDay();
    if (tomorrowDow === 0) {
      // Sun → next is Mon (index 5 covers Sun 9:01 PM – Mon 9:00 PM, so the Monday cycle comes from index 0/5 boundary)
      const idx = findCycle(1, 0, 0, 1, 21, 0);
      cycleIndex = (idx ?? 0) as CutoffCycleIndex;
    } else if (etDow === 4 && !isBeforeCutoff) {
      // Thu after 9 PM → cycle 4: Thu 9:01 PM – Sun 9:00 PM, delivery Tuesday
      const idx = findCycle(4, 21, 1, 0, 21, 0);
      cycleIndex = (idx ?? 4) as CutoffCycleIndex;
    } else if (etDow === 0) {
      // Sun after 9 PM → cycle 5: Sun 9:01 PM – Mon 9:00 PM, delivery Wednesday
      const idx = findCycle(0, 21, 1, 1, 21, 0);
      cycleIndex = (idx ?? 5) as CutoffCycleIndex;
    } else {
      const idx = findCycle(tomorrowDow, 0, 0, tomorrowDow, 21, 0);
      cycleIndex = (idx ?? 0) as CutoffCycleIndex;
    }
  }

  const cycle = CUTOFF_CYCLES[cycleIndex];
  // Compute the actual cutoffAtEt in UTC
  const cutoffAt = new Date(et);
  if (isBeforeCutoff) {
    cutoffAt.setHours(CUTOFF_HOUR_ET, CUTOFF_MINUTE_ET, 0, 0);
  } else {
    // move to tomorrow
    cutoffAt.setDate(cutoffAt.getDate() + 1);
    if (etDow === 4) {
      // Thu 9:01 PM – Sun 9:00 PM: cutoff is Sun 9 PM
      cutoffAt.setDate(cutoffAt.getDate() + (0 - 4 + 7) % 7);
    } else if (etDow === 0) {
      // Sun 9:01 PM – Mon 9:00 PM: cutoff is Mon 9 PM
      cutoffAt.setDate(cutoffAt.getDate() + 1);
    }
    cutoffAt.setHours(CUTOFF_HOUR_ET, CUTOFF_MINUTE_ET, 0, 0);
  }

  // Compute the delivery date (cycle.deliveryDow days from the start of the cycle)
  const deliveryDate = new Date(cutoffAt);
  const daysToDelivery = (cycle.deliveryDow - cutoffAt.getDay() + 7) % 7;
  deliveryDate.setDate(deliveryDate.getDate() + daysToDelivery);
  if (deliveryDate <= cutoffAt) deliveryDate.setDate(deliveryDate.getDate() + 7);

  const cutoffInMs = Math.max(0, cutoffAt.getTime() - now.getTime());
  const deliveryDateStr = deliveryDate.toISOString().slice(0, 10);

  return {
    timezone: TIMEZONE_ET,
    currentEt: now.toISOString(),
    cutoffAtEt: cutoffAt.toISOString(),
    cutoffInMs,
    guaranteedDeliveryDate: deliveryDateStr,
    guaranteedDeliveryDow: cycle.deliveryLabel,
    guaranteedDeliveryLocal: "12:00 PM",
    cycleIndex,
  };
}

export function nextStatusOnExpiry(orderId: string, currentStatus: OrderStatus): OrderStatus {
  // After the cancellation window expires, the order auto-advances
  if (currentStatus === "CANCELLATION_WINDOW") return "READY_FOR_TRANSFER";
  return currentStatus;
}
