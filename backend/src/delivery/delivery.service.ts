import { Injectable } from "@nestjs/common";
import {
  CUTOFF_CYCLES,
  CUTOFF_HOUR_ET,
  CUTOFF_MINUTE_ET,
  TIMEZONE_ET,
  type CutoffCycleIndex,
} from "@bannersin48/shared";

export interface DeliveryEstimate {
  timezone: string;
  currentEt: string;
  cutoffAtEt: string;
  cutoffInMs: number;
  guaranteedDeliveryDate: string; // YYYY-MM-DD
  guaranteedDeliveryDow: string; // "Wednesday"
  guaranteedDeliveryLocal: string; // "12:00 PM"
  cycleIndex: number;
}

/**
 * Computes the next 9:00 PM ET order cutoff and the guaranteed FedEx
 * delivery date, using the six cutoff cycles from @bannersin48/shared.
 * Ported from the MSW fixtures so the real API matches the mock responses.
 */
@Injectable()
export class DeliveryService {
  estimate(now: Date = new Date()): DeliveryEstimate {
    // Derive ET wall-clock time from the machine's date via Intl formatting.
    const etString = now.toLocaleString("en-US", { timeZone: TIMEZONE_ET });
    const et = new Date(etString);
    const etDow = et.getDay(); // 0 = Sunday … 6 = Saturday

    const cutoffToday = new Date(et);
    cutoffToday.setHours(CUTOFF_HOUR_ET, CUTOFF_MINUTE_ET, 0, 0);
    const isBeforeCutoff = et < cutoffToday;

    const findCycle = (
      startDow: number,
      startHour: number,
      startMinute: number,
      endDow: number,
      endHour: number,
      endMinute: number,
    ): CutoffCycleIndex | null => {
      for (const c of CUTOFF_CYCLES) {
        if (
          c.startDow === startDow &&
          c.startHourEt === startHour &&
          c.startMinuteEt === startMinute &&
          c.endDow === endDow &&
          c.endHourEt === endHour &&
          c.endMinuteEt === endMinute
        ) {
          return c.index;
        }
      }
      return null;
    };

    let cycleIndex: CutoffCycleIndex = 0;
    if (isBeforeCutoff) {
      cycleIndex = (findCycle(etDow, 0, 0, etDow, CUTOFF_HOUR_ET, CUTOFF_MINUTE_ET) ?? 0) as CutoffCycleIndex;
    } else {
      const tomorrow = new Date(et);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowDow = tomorrow.getDay();
      if (tomorrowDow === 0) {
        cycleIndex = (findCycle(1, 0, 0, 1, CUTOFF_HOUR_ET, CUTOFF_MINUTE_ET) ?? 0) as CutoffCycleIndex;
      } else if (etDow === 4) {
        cycleIndex = (findCycle(4, 21, 1, 0, CUTOFF_HOUR_ET, CUTOFF_MINUTE_ET) ?? 4) as CutoffCycleIndex;
      } else if (etDow === 0) {
        cycleIndex = (findCycle(0, 21, 1, 1, CUTOFF_HOUR_ET, CUTOFF_MINUTE_ET) ?? 5) as CutoffCycleIndex;
      } else {
        cycleIndex = (findCycle(tomorrowDow, 0, 0, tomorrowDow, CUTOFF_HOUR_ET, CUTOFF_MINUTE_ET) ?? 0) as CutoffCycleIndex;
      }
    }

    const cycle = CUTOFF_CYCLES[cycleIndex];

    // Absolute timestamp of the upcoming cutoff instant.
    const cutoffAt = new Date(et);
    if (isBeforeCutoff) {
      cutoffAt.setHours(CUTOFF_HOUR_ET, CUTOFF_MINUTE_ET, 0, 0);
    } else {
      cutoffAt.setDate(cutoffAt.getDate() + 1);
      if (etDow === 4) {
        // Thu after cutoff → weekend cycle ends Sunday 9 PM
        cutoffAt.setDate(cutoffAt.getDate() + ((0 - 4 + 7) % 7));
      } else if (etDow === 0) {
        // Sun after cutoff → cycle ends Monday 9 PM
        cutoffAt.setDate(cutoffAt.getDate() + 1);
      }
      cutoffAt.setHours(CUTOFF_HOUR_ET, CUTOFF_MINUTE_ET, 0, 0);
    }

    // Delivery date relative to the cutoff instant.
    const deliveryDate = new Date(cutoffAt);
    const daysToDelivery = (cycle.deliveryDow - cutoffAt.getDay() + 7) % 7;
    deliveryDate.setDate(deliveryDate.getDate() + daysToDelivery);
    if (deliveryDate <= cutoffAt) deliveryDate.setDate(deliveryDate.getDate() + 7);

    return {
      timezone: TIMEZONE_ET,
      currentEt: now.toISOString(),
      cutoffAtEt: cutoffAt.toISOString(),
      cutoffInMs: Math.max(0, cutoffAt.getTime() - now.getTime()),
      guaranteedDeliveryDate: deliveryDate.toISOString().slice(0, 10),
      guaranteedDeliveryDow: cycle.deliveryLabel,
      guaranteedDeliveryLocal: "12:00 PM",
      cycleIndex,
    };
  }
}
