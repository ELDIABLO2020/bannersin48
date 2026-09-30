import { QuotePurgeService } from "./quote-purge.service";
import type { PrismaService } from "../prisma/prisma.service";

describe("QuotePurgeService (H1 / M15)", () => {
  const now = new Date("2026-10-01T04:00:00Z");

  it("deletes quotes past validUntil, and legacy rows without one after 14 days", async () => {
    const deleteMany = jest.fn(async () => ({ count: 3 }));
    const service = new QuotePurgeService({ quote: { deleteMany } } as unknown as PrismaService);

    await expect(service.purgeExpired(now)).resolves.toBe(3);
    expect(deleteMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { validUntil: { lt: now } },
          { validUntil: null, createdAt: { lt: new Date("2026-09-17T04:00:00Z") } },
        ],
      },
    });
  });

  it("never throws out of the scheduler (a failed run is retried the next day)", async () => {
    const deleteMany = jest.fn(async () => {
      throw new Error("db down");
    });
    const service = new QuotePurgeService({ quote: { deleteMany } } as unknown as PrismaService);
    jest.spyOn((service as unknown as { logger: { error: () => void } }).logger, "error").mockImplementation(() => undefined);
    await expect(service.purgeExpired(now)).resolves.toBe(0);
  });

  it("is registered as a daily cron job", () => {
    const meta = Reflect.getMetadata("SCHEDULE_CRON_OPTIONS", QuotePurgeService.prototype.purgeExpired);
    expect(meta).toMatchObject({ cronTime: "0 04 * * *", name: "purge-expired-quotes" });
  });
});
