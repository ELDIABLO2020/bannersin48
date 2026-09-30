import { Injectable, Logger } from "@nestjs/common";
import { createHash } from "crypto";
import { PrismaService } from "../prisma/prisma.service";

export interface SendEmailInput {
  to: string;
  template: string; // e.g. "order_paid", "order_shipped"
  orderId?: string | null;
  payload?: Record<string, unknown>;
}

const SENSITIVE_KEY = /token|password|secret/i;

/**
 * Replaces credential-like values with a short sha256 fingerprint. The
 * fingerprint of a reset token matches the start of password_reset.tokenHash,
 * so log lines can still be correlated without exposing the token.
 */
export function redactPayload(payload: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (SENSITIVE_KEY.test(key)) {
      out[key] =
        typeof value === "string" && value.length > 0
          ? `[redacted sha256:${createHash("sha256").update(value).digest("hex").slice(0, 8)}]`
          : "[redacted]";
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      out[key] = redactPayload(value as Record<string, unknown>);
    } else {
      out[key] = value;
    }
  }
  return out;
}

/**
 * Local transactional-email stub: logs to console + persists every send into
 * email_log. A real transport (e.g. SES) replaces only this class — call sites stay put.
 * The transport gets the raw payload; the log line and email_log only ever see the redacted one.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger("Email");

  constructor(private readonly prisma: PrismaService) {}

  async send(input: SendEmailInput): Promise<void> {
    const redacted = redactPayload(input.payload ?? {});
    this.logger.log(`${input.template} → ${input.to} ${JSON.stringify(redacted)}`);
    await this.prisma.emailLog.create({
      data: {
        toEmail: input.to,
        template: input.template,
        orderId: input.orderId ?? null,
        status: "SENT",
        sentAt: new Date(),
        payload: (input.payload ? redacted : null) as object,
      },
    });
  }
}
