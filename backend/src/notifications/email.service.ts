import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export interface SendEmailInput {
  to: string;
  template: string; // e.g. "order_paid", "order_shipped"
  orderId?: string | null;
  payload?: Record<string, unknown>;
}

/**
 * Local transactional-email stub: logs to console + persists every send into
 * email_log. SES replaces the transport in Phase 1 — call sites stay put.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger("Email");

  constructor(private readonly prisma: PrismaService) {}

  async send(input: SendEmailInput): Promise<void> {
    this.logger.log(`${input.template} → ${input.to} ${JSON.stringify(input.payload ?? {})}`);
    await this.prisma.emailLog.create({
      data: {
        toEmail: input.to,
        template: input.template,
        orderId: input.orderId ?? null,
        status: "SENT",
        sentAt: new Date(),
        payload: (input.payload ?? null) as object,
      },
    });
  }
}
