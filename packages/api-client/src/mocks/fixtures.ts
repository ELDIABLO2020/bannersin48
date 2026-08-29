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
  type DeliveryResponse,
  type PopularSize,
  type User,
} from "@bannersin48/shared";

export const fixtures = {
  popularSizes: POPULAR_SIZES as PopularSize[],
};

interface MockOrderRecord {
  order: Order;
}

class MockStore {
  users: Map<string, { user: User; password: string }> = new Map();
  userIdCounter = 1;
  artwork: Map<
    string,
    {
      id: string;
      userId: string;
      folderId: string;
      filename: string;
      previewUrl: string;
      mime: string;
      size: number;
      widthPx?: number;
      heightPx?: number;
      dpi?: number;
    }
  > = new Map();
  artworkIdCounter = 1;
  artworkFolders: Array<{ id: string; name: string; parentId: string | null }> = [
    { id: "folder_home", name: "Home", parentId: null },
  ];
  quotes: Map<string, { request: Record<string, unknown>; validUntil: string; total: number }> = new Map();
  quoteIdCounter = 1;
  orders: Map<string, MockOrderRecord> = new Map();
  orderIdCounter = 1;
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

// Seed Image Zone sample assets in Home folder
store.artwork.set("art_sample_1", {
  id: "art_sample_1",
  userId: "user_demo",
  folderId: "folder_home",
  filename: "grand-opening.png",
  previewUrl: "/mock-artwork-portrait.svg",
  mime: "image/png",
  size: 240_000,
  widthPx: 1800,
  heightPx: 3600,
  dpi: 150,
});
store.artwork.set("art_sample_2", {
  id: "art_sample_2",
  userId: "user_demo",
  folderId: "folder_home",
  filename: "sale-banner.jpg",
  previewUrl: "/mock-artwork-landscape.svg",
  mime: "image/jpeg",
  size: 180_000,
  widthPx: 2400,
  heightPx: 1200,
  dpi: 150,
});
store.artworkIdCounter = 3;

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

