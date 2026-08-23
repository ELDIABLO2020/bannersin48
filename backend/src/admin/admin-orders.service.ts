import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { Order, OrderStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { OrdersService } from "../orders/orders.service";
import { ArtworkService } from "../artwork/artwork.service";
import { StorageService } from "../storage/storage.service";
import { EmailService } from "../notifications/email.service";
import { AuditService } from "../audit/audit.service";
import { isSlaBreached } from "../common/business-hours";
import { sniffMime } from "../artwork/artwork-inspect";

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
    private readonly artwork: ArtworkService,
    private readonly storage: StorageService,
    private readonly email: EmailService,
    private readonly audit: AuditService,
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
    for (const status of KANBAN_STATUSES) {
      if (!counts.has(status)) counts.set(status, 0);
    }
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
              downloadUrl: `/artwork/${item.artwork.id}/download`,
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
            labelDownloadUrl: row.shipments[0].labelFileId ? `/artwork/${row.shipments[0].labelFileId}/download` : null,
            shippedAt: row.shipments[0].shippedAt?.toISOString() ?? null,
            deliveredAt: row.shipments[0].deliveredAt?.toISOString() ?? null,
          }
        : null,
    };
  }

  // --- Checklist flow ---------------------------------------------------------

  async markPaid(orderId: string, actorId: string, ip?: string): Promise<void> {
    const order = await this.getOrder(orderId);
    if (order.paymentStatus !== "PENDING_PAYMENT") {
      throw new BadRequestException({
        code: "ALREADY_PAID",
        message: `Payment was already recorded (${order.paymentStatus}).`,
      });
    }
    // Locked reward rule: 1% of paid spend, stored as integer dollar-cents.
    // $95.50 earns 95 cents (fractional cents are floored).
    const totalCents = Math.round(Number(order.total) * 100);
    const rewardCents = Math.floor(totalCents / 100);
    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: { paymentStatus: "MARKED_PAID", rewardPointsEarned: rewardCents },
      });
      if (rewardCents > 0) {
        await tx.rewardLedger.create({
          data: { userId: order.userId, deltaCents: rewardCents, reason: "ORDER_EARN", orderId },
        });
        await tx.user.update({
          where: { id: order.userId },
          data: { rewardPointsBalance: { increment: rewardCents } },
        });
      }
    });
    await this.orders.transition(orderId, "IN_PROCESSING", {
      actorId,
      note: "Payment received — released to production.",
      emailed: true,
    });
    await this.audit.record({
      actorId,
      action: "order.mark_paid",
      entityType: "order",
      entityId: orderId,
      diff: AuditService.diffOf(
        { paymentStatus: order.paymentStatus, rewardPointsEarned: order.rewardPointsEarned },
        { paymentStatus: "MARKED_PAID", rewardPointsEarned: rewardCents },
      ),
      ip,
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
    if (existing) {
      throw new BadRequestException({
        code: "DROPSHIP_EXISTS",
        message: `A drop-ship submission (${existing.externalRef}) already exists for this order.`,
      });
    }
    await this.prisma.dropshipSubmission.create({
      data: {
        orderId,
        externalRef: input.externalRef.trim(),
        submittedBy: actorId,
        submittedAt: new Date(),
        notes: input.notes?.trim() || null,
      },
    });
    await this.orders.logActivity(orderId, actorId, `Submitted to drop shipper (ref ${input.externalRef}).`);
    await this.audit.record({
      actorId,
      action: "order.dropship_submit",
      entityType: "order",
      entityId: orderId,
      diff: { externalRef: { from: null, to: input.externalRef }, notes: { from: null, to: input.notes ?? null } },
      ip,
    });
    await this.notifyCustomer(order, "order_submitted_to_dropshipper", "Your order was submitted to production.");
  }

  async attachTracking(
    orderId: string,
    actorId: string,
    input: { trackingNumber: string },
    label?: { originalname: string; buffer: Buffer; size: number },
    ip?: string,
  ): Promise<void> {
    const order = await this.getOrder(orderId);
    if (order.paymentStatus === "PENDING_PAYMENT") {
      throw new BadRequestException({ code: "PAYMENT_REQUIRED", message: "Record payment before attaching tracking." });
    }

    let labelFileId: string | undefined;
    if (label && label.size > 0) {
      if (sniffMime(label.buffer) !== "application/pdf") {
        throw new BadRequestException({ code: "LABEL_NOT_PDF", message: "Shipment labels must be valid PDF files." });
      }
      const stored = await this.storage.put(
        StorageService.buildKey(actorId, label.originalname),
        label.buffer,
        "application/pdf",
      );
      const row = await this.prisma.artworkFile.create({
        data: {
          userId: actorId,
          s3Key: stored.key,
          s3Bucket: stored.bucket,
          originalFilename: `label-${order.number}.pdf`,
          mime: "application/pdf",
          bytes: label.size,
          scanStatus: "CLEAN",
          dpiReport: { source: "shipment_label" },
        },
      });
      labelFileId = row.id;
    }

    const existing = await this.prisma.shipment.findUnique({ where: { orderId } });
    const shipment = existing
      ? await this.prisma.shipment.update({
          where: { orderId },
          data: { trackingNumber: input.trackingNumber, ...(labelFileId ? { labelFileId } : {}) },
        })
      : await this.prisma.shipment.create({
          data: { orderId, trackingNumber: input.trackingNumber, ...(labelFileId ? { labelFileId } : {}) },
        });

    if (order.status === "IN_PROCESSING" || order.status === "ON_HOLD") {
      await this.orders.transition(orderId, "ACCEPTED", {
        actorId,
        note: `Accepted — FedEx tracking ${input.trackingNumber}.`,
        emailed: true,
      });
    } else {
      await this.orders.logActivity(orderId, actorId, `Tracking updated: ${input.trackingNumber}.`, { emailed: true });
    }
    await this.audit.record({
      actorId,
      action: existing ? "order.tracking_update" : "order.tracking_attach",
      entityType: "shipment",
      entityId: shipment.id,
      diff: { trackingNumber: { from: existing?.trackingNumber ?? null, to: input.trackingNumber } },
      ip,
    });
    await this.notifyCustomer(order, "order_accepted_with_tracking", {
      note: "Your banner order is accepted and in motion.",
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
    if (to === "SHIPPED") {
      await this.prisma.shipment.upsert({
        where: { orderId },
        update: { shippedAt: new Date() },
        create: { orderId, shippedAt: new Date() },
      });
      note = reason ?? "Package handed to FedEx.";
    }
    if (to === "DELIVERED") {
      await this.prisma.shipment.upsert({
        where: { orderId },
        update: { deliveredAt: new Date(), ...(reason ? {} : {}) },
        create: { orderId, deliveredAt: new Date() },
      });
      note = reason ?? "FedEx reports delivered.";
    }

    await this.orders.transition(orderId, to, {
      actorId,
      note,
      cancelledReason: to === "CANCELLED" ? reason : undefined,
      emailed: to === "SHIPPED" || to === "DELIVERED",
    });
    await this.audit.record({
      actorId,
      action: `order.${to.toLowerCase()}`,
      entityType: "order",
      entityId: orderId,
      diff: { status: { from: order.status, to } },
      ip,
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
