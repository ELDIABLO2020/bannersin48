import { describe, expect, it } from "vitest";
import { computeNextCutoff } from "./delivery";

// September 2026 is EDT (UTC-4): 9:00 PM ET = 01:00Z the next day.
const cases: Array<[label: string, nowIso: string, cutoffIso: string, date: string, dow: string, cycle: number]> = [
  ["Mon afternoon", "2026-09-14T19:00:00Z", "2026-09-15T01:00:00.000Z", "2026-09-16", "Wednesday", 0],
  ["Mon after cutoff → Tue", "2026-09-15T02:00:00Z", "2026-09-16T01:00:00.000Z", "2026-09-17", "Thursday", 1],
  ["Wed afternoon", "2026-09-16T19:00:00Z", "2026-09-17T01:00:00.000Z", "2026-09-18", "Friday", 2],
  ["Thu morning", "2026-09-17T14:00:00Z", "2026-09-18T01:00:00.000Z", "2026-09-21", "Monday", 3],
  ["Thu after cutoff → Sun", "2026-09-18T02:00:00Z", "2026-09-21T01:00:00.000Z", "2026-09-22", "Tuesday", 4],
  ["Fri → Sun", "2026-09-18T16:00:00Z", "2026-09-21T01:00:00.000Z", "2026-09-22", "Tuesday", 4],
  ["Sat → Sun", "2026-09-19T16:00:00Z", "2026-09-21T01:00:00.000Z", "2026-09-22", "Tuesday", 4],
  ["Sun before cutoff", "2026-09-20T16:00:00Z", "2026-09-21T01:00:00.000Z", "2026-09-22", "Tuesday", 4],
  ["Sun after cutoff → Mon", "2026-09-21T02:00:00Z", "2026-09-22T01:00:00.000Z", "2026-09-23", "Wednesday", 5],
];

describe("computeNextCutoff", () => {
  it.each(cases)("%s", (_label, nowIso, cutoffIso, date, dow, cycle) => {
    const now = new Date(nowIso);
    const result = computeNextCutoff(now);
    expect(result.cutoffAtEt).toBe(cutoffIso);
    expect(result.cutoffInMs).toBe(new Date(cutoffIso).getTime() - now.getTime());
    expect(result.guaranteedDeliveryDate).toBe(date);
    expect(result.guaranteedDeliveryDow).toBe(dow);
    expect(result.cycleIndex).toBe(cycle);
  });

  it("uses standard time in winter (9 PM EST = 02:00Z)", () => {
    expect(computeNextCutoff(new Date("2026-01-05T15:00:00Z")).cutoffAtEt).toBe("2026-01-06T02:00:00.000Z");
  });
});
