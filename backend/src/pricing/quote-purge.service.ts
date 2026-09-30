import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../prisma/prisma.service";
import { QUOTE_VALIDITY_DAYS } from "./pricing.service";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Quotes are only useful until `validUntil`: order creation rejects expired quotes,
 * and orders snapshot everything they need. Expired rows are deleted once a day
 * (cart_item.quoteId is ON DELETE SET NULL; server-side carts are unused anyway).
 */
@Injectable()
export class QuotePurgeService {
  private readonly logger = new Logger(QuotePurgeService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_4AM, { name: "purge-expired-quotes", timeZone: "UTC" })
  async purgeExpired(now = new Date()): Promise<number> {
    try {
      const { count } = await this.prisma.quote.deleteMany({
        where: {
          OR: [
            { validUntil: { lt: now } },
            // Legacy rows without an expiry: same lifetime as a normal quote.
            { validUntil: null, createdAt: { lt: new Date(now.getTime() - QUOTE_VALIDITY_DAYS * DAY_MS) } },
          ],
        },
      });
      if (count > 0) this.logger.log(`Purged ${count} expired quotes.`);
      return count;
    } catch (err) {
      // A failed purge must not crash the process; it is retried the next day.
      this.logger.error(`Quote purge failed: ${(err as Error).message}`);
      return 0;
    }
  }
}
