import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { productIdForMaterial, type PricingInput, type PricingLine } from "@bannersin48/shared";
import { PricingEngineService } from "../pricing/pricing-engine.service";
import { PricingService } from "../pricing/pricing.service";
import { ADDRESS_VALIDATION_VERSION, AddressService } from "../address/address.service";
import type { Order, OrderItem, OrderEvent, Quote } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CatalogService } from "../catalog/catalog.service";
import { DeliveryService } from "../delivery/delivery.service";
import { ArtworkService } from "../artwork/artwork.service";
import { assertMaterialOffered, assertSizeAllowed, normalizeFinishing, type ProductWithMaterials } from "../pricing/catalog-rules";
import { CUSTOMER_CANCELLABLE_STATUSES, assertTransition } from "./status-machine";
import type { CreateOrderDto, OrderLineDto } from "./orders.dto";

/** Versioned consent text for the liability checkbox (proof versioning deferred). */
export const PROOF_CONSENT_VERSION = "v1-2026-08";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const dec = (n: number) => n.toFixed(2);

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: CatalogService,
    private readonly delivery: DeliveryService,
    private readonly artwork: ArtworkService,
    private readonly engine: PricingEngineService,
    private readonly pricing: PricingService,
    private readonly addresses: AddressService,
  ) {}

  // --- Creation -------------------------------------------------------------

  async create(userId: string, dto: CreateOrderDto, ip?: string): Promise<OrderDetail> {
    const products = await this.loadProducts(dto.lines);

    // Validate every line against DB-driven catalog rules and ownership of artwork.
    for (const line of dto.lines) {
      const product = this.productFor(products, line);
      assertMaterialOffered(product, line.material);
      assertSizeAllowed(product, line.dimensions);
      if (!line.artworkId) {
        throw new BadRequestException({ code: "ARTWORK_REQUIRED", message: "Artwork is required for every order line." });
      }
      await this.artwork.assertUsableBy(userId, line.artworkId);
    }
    const quotes = await this.loadAndValidateQuotes(userId, dto.lines);

    // Re-price server-side through the shared engine (DB rates) — client totals are never trusted.
    const priced = await this.engine.priceLines(
      dto.lines.map((line) => ({
        productId: this.productFor(products, line).code,
        material: line.material,
        dimensions: line.dimensions,
        finishing: normalizeFinishing(line.finishing),
        quantity: line.quantity,
      })) as PricingInput[],
    );

    if (!priced.lines.every((l) => l.eligible)) {
      throw new BadRequestException({
        code: "NOT_ELIGIBLE",
        message: priced.lines.find((l) => !l.eligible)?.ineligibilityReason ?? "These lines are not eligible for online ordering.",
      });
    }

    const changedQuoteIndexes = priced.lines.flatMap((line, index) => {
      const snapshot = quotes[index]?.breakdown as { lines?: Array<{ totalBeforeTax?: number }> } | null;
      const quotedTotal = snapshot?.lines?.[0]?.totalBeforeTax;
      return quotedTotal === undefined || round2(quotedTotal) !== round2(line.totalBeforeTax) ? [index] : [];
    });
    if (changedQuoteIndexes.length > 0) {
      const replacementQuotes = await Promise.all(
        dto.lines.map((line) =>
          this.pricing.quote({
            productId: line.productId,
            material: line.material,
            dimensions: line.dimensions,
            finishing: line.finishing,
            quantity: line.quantity,
          }),
        ),
      );
      throw new ConflictException({
        code: "QUOTE_CHANGED",
        message: "Pricing changed. Review the replacement quote before submitting the order.",
        replacementQuotes,
      });
    }

    const now = new Date();
    const normalizedAddress = this.addresses.assertToken(dto.shipTo, dto.addressValidationToken);
    if (!dto.addressRiskAcknowledged) {
      throw new BadRequestException({
        code: "ADDRESS_RISK_ACKNOWLEDGEMENT_REQUIRED",
        message: "Confirm the unverified-address risk before submitting the order.",
      });
    }
    const estimate = this.delivery.estimate(now);
    const number = await this.nextOrderNumber();

    const order = await this.prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          number,
          userId,
          status: "RECEIVED",
          paymentStatus: "PENDING_PAYMENT",
          subtotal: dec(priced.subtotal),
          discountAmount: dec(0),
          taxAmount: dec(0), // sales tax deferred (§7.2)
          shippingAmount: dec(priced.shipping),
          total: dec(priced.total),
          shipAddress: this.shipAddressSnapshot(dto, normalizedAddress, now) as object,
          proofConfirmedAt: now, // acknowledgements are all required-true
          proofConsentTextVersion: PROOF_CONSENT_VERSION,
          proofConfirmIp: ip ?? null,
          placedAt: now,
        },
      });

      const items = await Promise.all(
        dto.lines.map((line, i) => {
          const product = this.productFor(products, line);
          const material = product.materials.find((m) => m.code === line.material)!;
          const l = priced.lines[i] as PricingLine;
          return tx.orderItem.create({
            data: {
              orderId: created.id,
              productId: product.id,
              productSlug: product.slug,
              description: `${product.name} · ${material.name}`,
              qty: line.quantity,
              widthIn: (line.dimensions.widthFt * 12 + line.dimensions.widthIn).toFixed(2),
              heightIn: (line.dimensions.heightFt * 12 + line.dimensions.heightIn).toFixed(2),
              billableSqft: l.billableSqFt.toFixed(2),
              materialCode: line.material,
              printSides: material.code.startsWith("VINYL_18OZ_DOUBLE") ? "double" : "single",
              finishings: normalizeFinishing(line.finishing) as object,
              unitPrice: dec(l.unitSubtotal),
              lineTotal: dec(l.totalBeforeTax),
              artworkFileId: line.artworkId,
              configSnapshot: {
                request: line,
                priced: l,
                productName: product.name,
                materialName: material.name,
                guaranteedDeliveryDate: estimate.guaranteedDeliveryDate,
              } as object,
            },
          });
        }),
      );

      await tx.orderEvent.create({
        data: {
          orderId: created.id,
          fromStatus: null,
          toStatus: "RECEIVED",
          actorId: userId,
          note: "Order placed.",
        },
      });

      return this.assembleDetail(created, items as OrderItem[], [
        {
          id: "evt_placed",
          orderId: created.id,
          fromStatus: null,
          toStatus: "RECEIVED",
          actorId: userId,
          note: "Order placed.",
          emailed: false,
          createdAt: now,
        } as OrderEvent,
      ]);
    });

    return order;
  }

  private async nextOrderNumber(): Promise<string> {
    const rows = await this.prisma.$queryRaw<{ nextval: bigint }[]>`SELECT nextval('order_number_seq') AS nextval`;
    const seq = Number(rows[0].nextval);
    return `BI48-${String(seq).padStart(6, "0")}`;
  }

  private async loadAndValidateQuotes(userId: string, lines: OrderLineDto[]): Promise<Quote[]> {
    const now = new Date();
    return Promise.all(
      lines.map(async (line) => {
        const quote = await this.prisma.quote.findUnique({ where: { id: line.quoteId } });
        if (!quote || (quote.userId !== null && quote.userId !== userId)) {
          throw new BadRequestException({ code: "QUOTE_INVALID", message: "The selected quote is not available for this account." });
        }
        if (!quote.validUntil || quote.validUntil <= now) {
          throw new ConflictException({ code: "QUOTE_EXPIRED", message: "The selected quote expired. Request a new quote before submitting." });
        }

        const request = quote.request as {
          productId?: string;
          material?: string;
          dimensions?: OrderLineDto["dimensions"];
          finishing?: OrderLineDto["finishing"];
          quantity?: number;
        };
        const productId = line.productId ?? productIdForMaterial(line.material as never);
        const quotedProductId = request.productId ?? (request.material ? productIdForMaterial(request.material as never) : undefined);
        const requestMatches =
          quotedProductId === productId &&
          request.material === line.material &&
          JSON.stringify(request.dimensions) === JSON.stringify(line.dimensions) &&
          JSON.stringify(normalizeFinishing(request.finishing)) === JSON.stringify(normalizeFinishing(line.finishing)) &&
          request.quantity === line.quantity;
        if (!requestMatches) {
          throw new BadRequestException({ code: "QUOTE_MISMATCH", message: "The quote does not match the submitted configuration." });
        }
        return quote;
      }),
    );
  }

  private async loadProducts(lines: OrderLineDto[]): Promise<Map<string, ProductWithMaterials>> {
    const map = new Map<string, ProductWithMaterials>();
    for (const line of lines) {
      const code = line.productId ?? productIdForMaterial(line.material as never);
      if (!map.has(code)) {
        const product = await this.catalog.getProductWithMaterials(code);
        if (!product || !product.active) {
          throw new NotFoundException({ code: "NOT_FOUND", message: "Product not found." });
        }
        map.set(code, product);
      }
    }
    return map;
  }

  private productFor(products: Map<string, ProductWithMaterials>, line: OrderLineDto): ProductWithMaterials {
    const code = line.productId ?? productIdForMaterial(line.material as never);
    const product = products.get(code);
    if (!product) {
      throw new NotFoundException({ code: "NOT_FOUND", message: "Product not found." });
    }
    return product;
  }

  private shipAddressSnapshot(
    dto: CreateOrderDto,
    normalized: ReturnType<AddressService["normalize"]>,
    acknowledgedAt: Date,
  ) {
    return {
      ...normalized,
      company: normalized.company || undefined,
      street2: normalized.street2 || undefined,
      phone: normalized.phone || undefined,
      email: normalized.email || dto.email,
      verificationStatus: "unverified",
      validationVersion: ADDRESS_VALIDATION_VERSION,
      riskAcknowledgedAt: acknowledgedAt.toISOString(),
    };
  }

  // --- Customer reads ---------------------------------------------------------

  async listMine(userId: string): Promise<OrderListItem[]> {
    const orders = await this.prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { items: { orderBy: { createdAt: "asc" }, take: 1 } },
      take: 200,
    });
    return orders.map((o) => this.toListSummary(o));
  }

  async getMineDetail(userId: string, orderId: string): Promise<OrderDetail> {
    const row = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, events: { orderBy: { createdAt: "asc" } }, shipments: true },
    });
    if (!row || row.userId !== userId) {
      throw new NotFoundException({ code: "NOT_FOUND", message: "Order not found." });
    }
    const detail = this.assembleDetail(row, row.items, row.events);
    const shipment = row.shipments[0];
    return {
      ...detail,
      fedexTracking: shipment?.trackingNumber
        ? {
            trackingNumber: shipment.trackingNumber,
            service: "FedEx",
            status: row.status,
            lastUpdate: shipment.updatedAt.toISOString(),
            labelDownloadUrl: shipment.labelFileId ? `/artwork/${shipment.labelFileId}/download` : null,
          }
        : undefined,
    };
  }

  async reorder(userId: string, orderId: string): Promise<ReorderResponse> {
    const row = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { orderBy: { createdAt: "asc" } } },
    });
    if (!row || row.userId !== userId) {
      throw new NotFoundException({ code: "NOT_FOUND", message: "Order not found." });
    }

    const lines = await Promise.all(
      row.items.map(async (item) => {
        if (!item.artworkFileId) {
          throw new BadRequestException({
            code: "ARTWORK_REPLACEMENT_REQUIRED",
            message: "Artwork is no longer available. Select a replacement before reordering.",
          });
        }
        await this.artwork.assertUsableBy(userId, item.artworkFileId);
        const snapshot = item.configSnapshot as {
          request?: {
            productId?: string;
            material?: string;
            dimensions?: OrderLineDto["dimensions"];
            finishing?: OrderLineDto["finishing"];
            quantity?: number;
          };
        };
        const request = snapshot.request;
        if (!request?.dimensions || !request.material) {
          throw new BadRequestException({
            code: "CONFIGURATION_UNAVAILABLE",
            message: "This historical configuration cannot be reordered online.",
          });
        }
        const quote = await this.pricing.quote({
          productId: request.productId,
          material: request.material,
          dimensions: request.dimensions,
          finishing: request.finishing,
          quantity: request.quantity ?? item.qty,
        });
        return {
          sourceOrderLineId: item.id,
          productId: request.productId ?? productIdForMaterial(request.material as never),
          material: request.material,
          dimensions: request.dimensions,
          finishing: normalizeFinishing(request.finishing),
          quantity: request.quantity ?? item.qty,
          artworkId: item.artworkFileId,
          quote,
        };
      }),
    );

    return {
      sourceOrderId: orderId,
      lines,
      warnings: ["Current catalog rules and prices were applied. Review the cart before submitting."],
    };
  }

  async cancel(userId: string, orderId: string, reason = "Cancelled by customer."): Promise<OrderDetail> {
    const row = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!row || row.userId !== userId) {
      throw new NotFoundException({ code: "NOT_FOUND", message: "Order not found." });
    }
    if (
      row.paymentStatus !== "PENDING_PAYMENT" ||
      !CUSTOMER_CANCELLABLE_STATUSES.includes(row.status)
    ) {
      throw new BadRequestException({
        code: "NOT_CANCELLABLE",
        message: "This order can no longer be cancelled online. Contact support.",
      });
    }
    await this.transition(orderId, "CANCELLED", { actorId: userId, note: reason, cancelledReason: reason });
    return this.getMineDetail(userId, orderId);
  }

  // --- Status machine -------------------------------------------------------

  /**
   * Single funnel for every status change: validates the transition, updates
   * the order, writes an order_event. actorId null = system.
   */
  async transition(
    orderId: string,
    to: Order["status"],
    opts: { actorId?: string | null; note?: string; emailed?: boolean; cancelledReason?: string } = {},
  ): Promise<void> {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException({ code: "NOT_FOUND", message: "Order not found." });
    assertTransition(order.status, to);

    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: to,
          ...(to === "CANCELLED" ? { cancelledAt: new Date(), cancelReason: opts.cancelledReason ?? opts.note ?? null } : {}),
        },
      });
      await tx.orderEvent.create({
        data: {
          orderId,
          fromStatus: order.status,
          toStatus: to,
          actorId: opts.actorId ?? null,
          note: opts.note ?? null,
          emailed: opts.emailed ?? false,
        },
      });
    });
  }

  /** Timeline entry without a status change (e.g. "dropship ref recorded"). */
  async logActivity(
    orderId: string,
    actorId: string | null,
    note: string,
    opts: { emailed?: boolean } = {},
  ): Promise<void> {
    const order = await this.prisma.order.findUniqueOrThrow({ where: { id: orderId }, select: { status: true } });
    await this.prisma.orderEvent.create({
      data: {
        orderId,
        fromStatus: order.status,
        toStatus: order.status,
        actorId,
        note,
        emailed: opts.emailed ?? false,
      },
    });
  }

  // --- Serialization ----------------------------------------------------------

  toListSummary(o: Order & { items: OrderItem[] }): OrderListItem {
    const first = o.items[0];
    const estimate = this.delivery.estimate(o.placedAt ?? o.createdAt);
    const widthFt = first ? Math.floor(Number(first.widthIn) / 12) : 0;
    const heightFt = first ? Math.floor(Number(first.heightIn) / 12) : 0;
    return {
      id: o.id,
      orderNumber: o.number,
      status: o.status,
      paymentStatus: o.paymentStatus,
      total: round2(Number(o.total)),
      totalLabel: `$${Number(o.total).toFixed(2)}`,
      createdAt: o.createdAt.toISOString(),
      placedAt: o.placedAt?.toISOString() ?? null,
      firstLineLabel: first ? `${widthFt}' × ${heightFt}'` : "—",
      firstLineQty: first?.qty ?? 0,
      guaranteedDeliveryDate: estimate.guaranteedDeliveryDate,
    };
  }

  assembleDetail(o: Order, items: OrderItem[], events: OrderEvent[]): OrderDetail {
    const estimate = this.delivery.estimate(o.placedAt ?? o.createdAt);
    return {
      id: o.id,
      orderNumber: o.number,
      status: o.status,
      paymentStatus: o.paymentStatus,
      subtotal: round2(Number(o.subtotal)),
      shipping: round2(Number(o.shippingAmount)),
      tax: round2(Number(o.taxAmount)),
      rewardsDiscount: 0,
      total: round2(Number(o.total)),
      currency: o.currency,
      shipTo: o.shipAddress as Record<string, unknown>,
      artworkIds: items.map((i) => i.artworkFileId).filter((x): x is string => Boolean(x)),
      guaranteedDeliveryDate: estimate.guaranteedDeliveryDate,
      guaranteedDeliveryDow: estimate.guaranteedDeliveryDow,
      proofConfirmedAt: o.proofConfirmedAt?.toISOString() ?? null,
      placedAt: o.placedAt?.toISOString() ?? null,
      createdAt: o.createdAt.toISOString(),
      updatedAt: o.updatedAt.toISOString(),
      lines: items.map((i) => this.toLinePayload(i)),
      events: events.map((e) => ({
        id: e.id,
        fromStatus: e.fromStatus,
        toStatus: e.toStatus,
        actorId: e.actorId,
        note: e.note,
        createdAt: e.createdAt.toISOString(),
      })),
    };
  }

  private toLinePayload(i: OrderItem) {
    const snapshot = (i.configSnapshot ?? {}) as {
      priced?: PricingLine;
      request?: { productId?: string; dimensions?: Record<string, number>; finishing?: Record<string, unknown> };
    };
    const dims = snapshot.priced?.billableDims ?? { widthFt: Math.floor(Number(i.widthIn) / 12), heightFt: Math.floor(Number(i.heightIn) / 12) };
    return {
      id: i.id,
      productId: snapshot.request?.productId ?? i.productId,
      productSlug: i.productSlug,
      description: i.description,
      material: i.materialCode,
      printSides: i.printSides,
      quantity: i.qty,
      dimensions: snapshot.request?.dimensions ?? {
        widthFt: Math.floor(Number(i.widthIn) / 12),
        widthIn: Number(i.widthIn) % 12,
        heightFt: Math.floor(Number(i.heightIn) / 12),
        heightIn: Number(i.heightIn) % 12,
      },
      finishing: snapshot.request?.finishing ?? i.finishings ?? {},
      artworkId: i.artworkFileId,
      unitProduct: round2(Number(i.unitPrice)),
      addons: round2(snapshot.priced?.addons ?? 0),
      productSubtotal: round2(Number(i.unitPrice) * i.qty),
      shipping: round2(Number(i.lineTotal) - Number(i.unitPrice) * i.qty),
      totalBeforeTax: round2(Number(i.lineTotal)),
      billableSqFt: Number(i.billableSqft),
      billableDims: dims,
    };
  }
}

// --- Public shapes (documented in docs/backend-scope.md notes) ----------------

export interface OrderListItem {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  total: number;
  totalLabel: string;
  createdAt: string;
  placedAt: string | null;
  firstLineLabel: string;
  firstLineQty: number;
  guaranteedDeliveryDate: string;
}

export interface ReorderResponse {
  sourceOrderId: string;
  lines: Array<{
    sourceOrderLineId: string;
    productId: string;
    material: string;
    dimensions: OrderLineDto["dimensions"];
    finishing: ReturnType<typeof normalizeFinishing>;
    quantity: number;
    artworkId: string;
    quote: Awaited<ReturnType<PricingService["quote"]>>;
  }>;
  warnings: string[];
}

export interface OrderDetail {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  subtotal: number;
  shipping: number;
  tax: number;
  rewardsDiscount: number;
  total: number;
  currency: string;
  shipTo: Record<string, unknown>;
  artworkIds: string[];
  guaranteedDeliveryDate: string;
  guaranteedDeliveryDow: string;
  proofConfirmedAt: string | null;
  placedAt: string | null;
  createdAt: string;
  updatedAt: string;
  lines: ReturnType<OrdersService["toLinePayload"]>[];
  events: Array<{
    id: string;
    fromStatus: string | null;
    toStatus: string;
    actorId: string | null;
    note: string | null;
    createdAt: string;
  }>;
  fedexTracking?: {
    trackingNumber: string;
    service: string;
    status: string;
    lastUpdate: string;
    labelDownloadUrl: string | null;
  };
}
