import { addBusinessHours, isSlaBreached } from "./business-hours";

describe("48-business-hour SLA", () => {
  it("adds 48h within a weekday span", () => {
    // Tuesday 10:00 UTC
    const start = new Date("2026-01-06T10:00:00Z");
    expect(addBusinessHours(start, 48).toISOString()).toBe(new Date("2026-01-08T10:00:00Z").toISOString()); // Thursday same time
  });

  it("skips weekends entirely", () => {
    // Thursday 21:00 UTC + 48 business hours → skips Sat+Sun → Monday 21:00 UTC
    const start = new Date("2026-01-08T21:00:00Z"); // Thursday
    expect(addBusinessHours(start, 48).toISOString()).toBe(new Date("2026-01-12T21:00:00Z").toISOString()); // Monday
  });

  it("flags orders breaching the promise", () => {
    // Wednesday 10:00 UTC placed; now Friday 12:00 UTC → 50h elapsed, > 48 business hours
    expect(isSlaBreached(new Date("2026-01-07T10:00:00Z"), new Date("2026-01-09T12:00:00Z"))).toBe(true);
    expect(isSlaBreached(new Date("2026-01-07T10:00:00Z"), new Date("2026-01-09T09:00:00Z"))).toBe(false);
    // Weekend pause: Thursday 21:00 UTC + 48bh → deadline Monday 21:00; Saturday is not breached
    expect(isSlaBreached(new Date("2026-01-08T21:00:00Z"), new Date("2026-01-10T12:00:00Z"))).toBe(false);
    expect(isSlaBreached(new Date("2026-01-08T21:00:00Z"), new Date("2026-01-12T22:00:00Z"))).toBe(true);
  });
});
