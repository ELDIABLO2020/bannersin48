import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, type Order, type OrderStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { OrdersService } from "../orders/orders.service";
import { StorageService } from "../storage/storage.service";
import { EmailService } from "../notifications/email.service";
import { AuditService } from "../audit/audit.service";
import { isSlaBreached } from "../common/business-hours";
import { ArtworkService } from "../artwork/artwork.service";
import type { UploadedTempFile } from "../storage/upload-storage";
import { assertTransition } from "../orders/status-machine";

const KANBAN_STATUSES: OrderStatus[] = [
  "RECEIVED",
  "AWAITING_PAYMENT",
  "IN_PROCESSING",
  "ACCEPTED",
  "SHIPPED",
  "DELIVERED",
  "ON_HOLD",
  "CANCELLED",
];

const SLA_RELEVANT_STATUSES: OrderStatus[] = ["RECEIVED", "AWAITING_PAYMENT", "IN_PROCESSING"];
const OPEN_STATUSES: OrderStatus[] = ["RECEIVED", "AWAITING_PAYMENT", "IN_PROCESSING", "ACCEPTED", "ON_HOLD"];

/** "Today" on the dashboard is the shop's day, not the server's. */
export const DASHBOARD_TIME_ZONE = "America/New_York";

export interface AdminDashboard {
  buckets: Array<{ status: string; count: number; slaBreachedCount: number }>;
  /** Counts since local midnight (`since`). `paid` = payment confirmed today; `shipped` = handed to the carrier today. */
  today: { since: string; placed: number; paid: number; shipped: number };
  openOrders: number;
  slaBreachedCount: number;
  updatedAt: string;
}

/**
 * Midnight of the current day in `timeZone`, as an instant. Reads the zone's
 * wall clock through Intl, so no timezone library is needed; the DST switch
 * itself happens at 02:00, never at midnight, so the offset at "now" is the
 * offset at midnight for every day of the year.
 */
export function startOfDayInZone(now: Date, timeZone: string): Date {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  const wallClockAsUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  const offsetMs = wallClockAsUtc - Math.floor(now.getTime() / 1000) * 1000;
  return new Date(Date.UTC(+parts.year, +parts.month - 1, +parts.day) - offsetMs);
}

export interface AdminOrderListItem {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  totalLabel: string;
  userEmail: string | null;
  firstLineLabel: string;
  placedAt: string | null;
  slaBreached: boolean;
}

@Injectable()
export class AdminOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orders: OrdersService,
    private readonly storage: StorageService,
    private readonly email: EmailService,
    private readonly audit: AuditService,
    private readonly artwork: ArtworkService,
  ) {}

  // --- Kanban + lists -------------------------------------------------------

  async buckets() {
    const orders = await this.prisma.order.findMany({
      where: { status: { in: SLA_RELEVANT_STATUSES } },
      select: { status: true, placedAt: true },
    });
    const counts = new Map<string, number>(KANBAN_STATUSES.map((s) => [s, 0]));
    const breached = new Map<string, number>();
    const now = new Date();
    const grouped = await this.prisma.order.groupBy({ by: ["status"], _count: { _all: true } });
    for (const g of grouped) {
      counts.set(g.status, g._count._all);
    }
    for (const o of orders) {
      if (o.placedAt && isSlaBreached(o.placedAt, now)) {
        breached.set(o.status, (breached.get(o.status) ?? 0) + 1);
      }
    }
    return {
      buckets: KANBAN_STATUSES.map((status) => ({
        status,
        count: counts.get(status) ?? 0,
        slaBreachedCount: breached.get(status) ?? 0,
      })),
      updatedAt: now.toISOString(),
    };
  }

  /** `GET /admin/dashboard`: the buckets plus today's throughput and the SLA picture (plan §5.2). */
  async dashboard(now: Date = new Date()): Promise<AdminDashboard> {
    const since = startOfDayInZone(now, DASHBOARD_TIME_ZONE);
    const [buckets, placed, paid, shipped] = await Promise.all([
      this.buckets(),
      this.prisma.order.count({ where: { placedAt: { gte: since } } }),
      this.prisma.order.count({ where: { paymentConfirmedAt: { gte: since } } }),
      this.prisma.shipment.count({ where: { shippedAt: { gte: since } } }),
    ]);
    return {
      buckets: buckets.buckets,
      today: { since: since.toISOString(), placed, paid, shipped },
      openOrders: buckets.buckets.filter((b) => OPEN_STATUSES.includes(b.status as OrderStatus)).reduce((sum, b) => sum + b.count, 0),
      slaBreachedCount: buckets.buckets.reduce((sum, b) => sum + b.slaBreachedCount, 0),
      updatedAt: buckets.updatedAt,
    };
  }

  async list(opts: { status?: string; page?: number; pageSize?: number }): Promise<{
    items: AdminOrderListItem[];
    page: number;
    pageSize: number;
    total: number;
  }> {
    const page = Math.max(1, opts.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, opts.pageSize ?? 25));
    const where = opts.status ? { status: opts.status as never } : {};
    const [total, rows] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        orderBy: [{ placedAt: "desc" }, { createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { user: { select: { email: true } }, items: { orderBy: { createdAt: "asc" }, take: 1 } },
      }),
    ]);
    return {
      page,
      pageSize,
      total,
      items: rows.map((o) => ({
        id: o.id,
        orderNumber: o.number,
        status: o.status,
        paymentStatus: o.paymentStatus,
        totalLabel: `$${Number(o.total).toFixed(2)}`,
        userEmail: o.user.email,
        firstLineLabel: o.items[0] ? `${Math.floor(Number(o.items[0].widthIn) / 12)}' × ${Math.floor(Number(o.items[0].heightIn) / 12)}'` : "—",
        placedAt: o.placedAt?.toISOString() ?? null,
        slaBreached: Boolean(o.placedAt && SLA_RELEVANT_STATUSES.includes(o.status) && isSlaBreached(o.placedAt)),
      })),
    };
  }

  /** Full detail for the fulfillment workspace. */
  async detail(orderId: string): Promise<Record<string, unknown>> {
    const row = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { artwork: true, product: { select: { name: true, slug: true } } } },
        events: { orderBy: { createdAt: "asc" } },
        user: { select: { email: true, firstName: true, lastName: true, phone: true } },
        dropship: true,
        shipments: true,
      },
    });
    if (!row) throw new NotFoundException({ code: "NOT_FOUND", message: "Order not found." });

    const base = this.orders.assembleDetail(row, row.items, row.events);
    return {
      ...base,
      customer: row.user,
      slaBreached: Boolean(row.placedAt && SLA_RELEVANT_STATUSES.includes(row.status) && isSlaBreached(row.placedAt)),
      items: row.items.map((item, i) => ({
        ...base.lines[i],
        productName: item.product.name,
        configSnapshot: item.configSnapshot,
        artwork: item.artwork
          ? {
              id: item.artwork.id,
              filename: item.artwork.originalFilename,
              mimeType: item.artwork.mime,
              sizeBytes: item.artwork.bytes,
              widthPx: item.artwork.widthPx,
              heightPx: item.artwork.heightPx,
              // Signed, 5 minutes: for the inline preview. Downloads mint their own link.
              previewUrl: this.artwork.previewUrl(item.artwork.id),
            }
          : null,
      })),
      dropship: row.dropship
        ? {
            externalRef: row.dropship.externalRef,
            submittedBy: row.dropship.submittedBy,
            submittedAt: row.dropship.submittedAt.toISOString(),
            notes: row.dropship.notes,
          }
        : null,
      shipment: row.shipments[0]
        ? {
            carrier: row.shipments[0].carrier,
            trackingNumber: row.shipments[0].trackingNumber,
            labelFileId: row.shipments[0].labelFileId,
            shippedAt: row.shipments[0].shippedAt?.toISOString() ?? null,
            deliveredAt: row.shipments[0].deliveredAt?.toISOString() ?? null,
          }
        : null,
    };
  }

  // --- Notes ------------------------------------------------------------------

  /**
   * Internal activity note (`orders:note`): a same-status `order_event` the
   * customer is never emailed about, plus the audit row, in one transaction.
   */
  async addNote(orderId: string, actorId: string, note: string, ip?: string): Promise<void> {
    await this.getOrder(orderId);
    const text = note.trim();
    await this.prisma.$transaction(async (tx) => {
      await this.orders.logActivity(orderId, actorId, text, { emailed: false }, tx);
      await this.audit.record({ actorId, action: "order.note", entityType: "order", entityId: orderId, diff: { note: text }, ip }, tx);
    });
  }

  // --- Checklist flow ---------------------------------------------------------

  /**
   * Records manual payment: → IN_PROCESSING, rewards credited, audited. Everything
   * is validated before any write, and every write commits together. The status
   * change is a compare-and-set on (status, PENDING_PAYMENT), so of two concurrent
   * calls exactly one credits rewards and the other gets 409.
   */
  async markPaid(orderId: string, actorId: string, ip?: string): Promise<void> {
    const order = await this.getOrder(orderId);
    if (order.paymentStatus !== "PENDING_PAYMENT") {
      throw new ConflictException({
        code: "ALREADY_PAID",
        message: `Payment was already recorded (${order.paymentStatus}).`,
      });
    }
    assertTransition(order.status, "IN_PROCESSING");

    // Locked reward rule: 1% of paid spend, stored as integer dollar-cents.
    // $95.50 earns 95 cents (fractional cents are floored).
    const totalCents = Math.round(Number(order.total) * 100);
    const rewardCents = Math.floor(totalCents / 100);

    await this.prisma.$transaction(async (tx) => {
      await this.orders.applyTransition(
        tx,
        order,
        "IN_PROCESSING",
        { actorId, note: "Payment received — released to production.", emailed: true },
        {
          where: { paymentStatus: "PENDING_PAYMENT" },
          data: { paymentStatus: "MARKED_PAID", rewardPointsEarned: rewardCents },
        },
      );
      if (rewardCents > 0) {
        await tx.rewardLedger.create({
          data: { userId: order.userId, deltaCents: rewardCents, reason: "ORDER_EARN", orderId },
        });
        await tx.user.update({
          where: { id: order.userId },
          data: { rewardPointsBalance: { increment: rewardCents } },
        });
      }
      await this.audit.record(
        {
          actorId,
          action: "order.mark_paid",
          entityType: "order",
          entityId: orderId,
          diff: AuditService.diffOf(
            { status: order.status, paymentStatus: order.paymentStatus, rewardPointsEarned: order.rewardPointsEarned },
            { status: "IN_PROCESSING", paymentStatus: "MARKED_PAID", rewardPointsEarned: rewardCents },
          ),
          ip,
        },
        tx,
      );
    });
    await this.notifyCustomer(order, "order_paid", "Payment received for your order.");
  }

  async recordDropship(
    orderId: string,
    actorId: string,
    input: { externalRef: string; notes?: string },
    ip?: string,
  ): Promise<void> {
    const order = await this.getOrder(orderId);
    if (order.paymentStatus === "PENDING_PAYMENT") {
      throw new BadRequestException({
        code: "PAYMENT_REQUIRED",
        message: "Record payment before submitting to the drop shipper.",
      });
    }
    const existing = await this.prisma.dropshipSubmission.findUnique({ where: { orderId } });
    if (existing) throw dropshipExists(existing.externalRef);

    const externalRef = input.externalRef.trim();
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.dropshipSubmission.create({
          data: { orderId, externalRef, submittedBy: actorId, submittedAt: new Date(), notes: input.notes?.trim() || null },
        });
        await this.orders.logActivity(orderId, actorId, `Submitted to drop shipper (ref ${externalRef}).`, {}, tx);
        await this.audit.record(
          {
            actorId,
            action: "order.dropship_submit",
            entityType: "order",
            entityId: orderId,
            diff: { externalRef: { from: null, to: externalRef }, notes: { from: null, to: input.notes ?? null } },
            ip,
          },
          tx,
        );
      });
    } catch (err) {
      // Lost the race with a concurrent submission (unique orderId).
      if (isUniqueViolation(err)) throw dropshipExists();
      throw err;
    }
    await this.notifyCustomer(order, "order_submitted_to_dropshipper", "Your order was submitted to production.");
  }

  /**
   * Records the tracking number and (optionally) the label PDF, which multer has
   * already streamed to a temp file. IN_PROCESSING / ON_HOLD orders move to ACCEPTED.
   */
  async attachTracking(
    orderId: string,
    actorId: string,
    input: { trackingNumber: string },
    label?: UploadedTempFile,
    ip?: string,
  ): Promise<void> {
    try {
      await this.saveTracking(orderId, actorId, input, label, ip);
    } finally {
      await this.storage.discard(label?.path);
    }
  }

  private async saveTracking(
    orderId: string,
    actorId: string,
    input: { trackingNumber: string },
    label: UploadedTempFile | undefined,
    ip?: string,
  ): Promise<void> {
    const order = await this.getOrder(orderId);
    if (order.paymentStatus === "PENDING_PAYMENT") {
      throw new BadRequestException({ code: "PAYMENT_REQUIRED", message: "Record payment before attaching tracking." });
    }
    const hasLabel = Boolean(label && label.size > 0);
    if (label && hasLabel && label.detectedMime !== "application/pdf") {
      throw new BadRequestException({ code: "LABEL_NOT_PDF", message: "Shipment labels must be valid PDF files." });
    }
    // Labels are keyed by order + content, outside every customer's library prefix.
    const storedLabel =
      label && hasLabel
        ? await this.storage.commit(label.path, StorageService.contentKey(`labels/${orderId}`, label.sha256, "application/pdf"))
        : null;

    const accept = order.status === "IN_PROCESSING" || order.status === "ON_HOLD";
    const existing = await this.prisma.$transaction(async (tx) => {
      let labelFileId: string | undefined;
      if (label && storedLabel) {
        const row = await tx.artworkFile.create({
          data: {
            // The uploading staff member; the order's customer can still download it (M4).
            userId: actorId,
            s3Key: storedLabel.key,
            s3Bucket: storedLabel.bucket,
            originalFilename: `label-${order.number}.pdf`,
            mime: "application/pdf",
            bytes: label.size,
            sha256: label.sha256,
            scanStatus: "CLEAN",
            dpiReport: { source: "shipment_label" },
          },
        });
        labelFileId = row.id;
      }

      const before = await tx.shipment.findUnique({ where: { orderId } });
      const shipment = await tx.shipment.upsert({
        where: { orderId },
        update: { trackingNumber: input.trackingNumber, ...(labelFileId ? { labelFileId } : {}) },
        create: { orderId, trackingNumber: input.trackingNumber, ...(labelFileId ? { labelFileId } : {}) },
      });

      if (accept) {
        await this.orders.applyTransition(tx, order, "ACCEPTED", {
          actorId,
          note: `Accepted — FedEx tracking ${input.trackingNumber}.`,
          emailed: true,
        });
      } else {
        await this.orders.logActivity(orderId, actorId, `Tracking updated: ${input.trackingNumber}.`, { emailed: true }, tx);
      }
      await this.audit.record(
        {
          actorId,
          action: before ? "order.tracking_update" : "order.tracking_attach",
          entityType: "shipment",
          entityId: shipment.id,
          diff: { trackingNumber: { from: before?.trackingNumber ?? null, to: input.trackingNumber } },
          ip,
        },
        tx,
      );
      return before;
    });

    await this.notifyCustomer(order, "order_accepted_with_tracking", {
      note: existing ? "Your tracking details were updated." : "Your banner order is accepted and in motion.",
      trackingUrl: `https://www.fedex.com/fedextrack/?trknbr=${input.trackingNumber}`,
    });
  }

  async transitionTo(
    orderId: string,
    to: OrderStatus,
    actorId: string,
    reason?: string,
    ip?: string,
  ): Promise<void> {
    const order = await this.getOrder(orderId);

    let note = reason ?? `Status changed to ${to}.`;
    if (to === "SHIPPED") note = reason ?? "Package handed to FedEx.";
    if (to === "DELIVERED") note = reason ?? "FedEx reports delivered.";

    // Shipment timestamps and the audit row commit with the status change, or not at all (L5).
    await this.orders.transition(orderId, to, {
      actorId,
      note,
      cancelledReason: to === "CANCELLED" ? reason : undefined,
      emailed: to === "SHIPPED" || to === "DELIVERED",
      inTx: async (tx, from) => {
        const now = new Date();
        if (to === "SHIPPED") {
          await tx.shipment.upsert({ where: { orderId }, update: { shippedAt: now }, create: { orderId, shippedAt: now } });
        }
        if (to === "DELIVERED") {
          await tx.shipment.upsert({ where: { orderId }, update: { deliveredAt: now }, create: { orderId, deliveredAt: now } });
        }
        await this.audit.record(
          {
            actorId,
            action: `order.${to.toLowerCase()}`,
            entityType: "order",
            entityId: orderId,
            diff: { status: { from, to } },
            ip,
          },
          tx,
        );
      },
    });
    if (to === "SHIPPED") await this.notifyShipped(orderId);
    if (to === "DELIVERED") await this.notifyCustomer(order, "order_delivered", "Your banners were delivered.");
  }

  // --- helpers --------------------------------------------------------------

  private async getOrder(id: string): Promise<Order> {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException({ code: "NOT_FOUND", message: "Order not found." });
    return order;
  }

  private async notifyCustomer(order: Order, template: string, payloadOrNote: Record<string, unknown> | string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: order.userId }, select: { email: true } });
    if (!user) return;
    const payload = typeof payloadOrNote === "string" ? { note: payloadOrNote } : payloadOrNote;
    try {
      await this.email.send({
        to: user.email,
        template,
        orderId: order.id,
        payload: { orderNumber: order.number, ...payload },
      });
    } catch {
      // email failures must never break fulfillment
    }
  }

  private async notifyShipped(orderId: string): Promise<void> {
    const shipment = await this.prisma.shipment.findUnique({ where: { orderId } });
    const order = await this.getOrder(orderId);
    await this.notifyCustomer(order, "order_shipped", {
      trackingNumber: shipment?.trackingNumber ?? null,
      trackingUrl: shipment?.trackingNumber
        ? `https://www.fedex.com/fedextrack/?trknbr=${shipment.trackingNumber}`
        : null,
    });
  }
}

function dropshipExists(externalRef?: string): ConflictException {
  return new ConflictException({
    code: "DROPSHIP_EXISTS",
    message: externalRef
      ? `A drop-ship submission (${externalRef}) already exists for this order.`
      : "A drop-ship submission already exists for this order.",
  });
}

function isUniqueViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}
