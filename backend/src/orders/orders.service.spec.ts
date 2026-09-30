import { BadRequestException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { OrdersService } from "./orders.service";
import { CatalogService } from "../catalog/catalog.service";
import { DeliveryService } from "../delivery/delivery.service";
import { ArtworkService } from "../artwork/artwork.service";
import { PrismaService } from "../prisma/prisma.service";
import { PricingEngineService } from "../pricing/pricing-engine.service";
import { PricingService } from "../pricing/pricing.service";
import { AddressService } from "../address/address.service";
import { assertTransition } from "./status-machine";
import type { CreateOrderDto } from "./orders.dto";

/**
 * Order creation must reproduce the known pricing cases server-side
 * (3×6 HD Banner 15oz qty 1 → $85.50 product + $10 shipping = $95.50),
 * snapshot everything, validate artwork ownership, and enforce the
 * order status machine.
 */
const HD_ROW = {
  id: "prod_hd",
  code: "HD_BANNER",
  slug: "hd-banner",
  name: "HD Banner",
  active: true,
  sizeMode: "CUSTOM",
  minWidthIn: 12,
  minHeightIn: 12,
  shortSideMaxIn: null,
  maxBillableFt: 10,
  materials: [
    { code: "VINYL_13OZ_SINGLE", name: '13 oz Vinyl', doubleSideMultiplier: "1", active: true },
    { code: "VINYL_15OZ_SINGLE", name: '15 oz Vinyl', doubleSideMultiplier: "1", active: true },
    { code: "VINYL_18OZ_SINGLE", name: '18 oz Vinyl', doubleSideMultiplier: "1", active: true },
    { code: "VINYL_18OZ_DOUBLE", name: '18 oz Vinyl Double-Sided', doubleSideMultiplier: "1.58", active: true },
  ],
};

const ESTIMATE = {
  timezone: "America/New_York",
  currentEt: new Date().toISOString(),
  cutoffAtEt: new Date().toISOString(),
  cutoffInMs: 1000,
  guaranteedDeliveryDate: "2026-01-07",
  guaranteedDeliveryDow: "Wednesday",
  guaranteedDeliveryLocal: "12:00 PM",
  cycleIndex: 0,
};

function makePrismaMock() {
  const stored: Record<string, unknown> = {};

  const orderRow = (data: Record<string, unknown>) => ({
    id: "ord_test1",
    currency: "USD",
    discountAmount: "0",
    cancelledAt: null,
    cancelReason: null,
    promoCodeId: null,
    rewardPointsEarned: 0,
    proofConfirmedAt: null,
    proofConsentTextVersion: null,
    proofConfirmIp: null,
    placedAt: null,
    createdAt: new Date("2026-01-05T12:00:00Z"),
    updatedAt: new Date("2026-01-05T12:00:00Z"),
    ...data,
  });
  const prisma: any = {
    $queryRaw: jest.fn(async () => [{ nextval: 7n }]),
    $transaction: jest.fn(async (fn: (tx: any) => Promise<unknown>) => fn(prisma)),
    quote: {
      findUnique: jest.fn(async () => ({
        id: "quote_ok",
        userId: null,
        request: {
          productId: "HD_BANNER",
          material: "VINYL_15OZ_SINGLE",
          dimensions: { widthFt: 3, widthIn: 0, heightFt: 6, heightIn: 0 },
          finishing: { welding: true, grommets: true },
          quantity: 1,
        },
        breakdown: { lines: [{ totalBeforeTax: 95.5 }] },
        validUntil: new Date(Date.now() + 60_000),
      })),
    },
    order: {
      create: jest.fn(async ({ data }: any) => {
        Object.assign(stored, { order: data });
        return orderRow(data);
      }),
      findUnique: jest.fn(),
      findMany: jest.fn(async () => []),
      update: jest.fn(async ({ data, where }: any) => ({ id: where.id, status: data.status })),
      updateMany: jest.fn(async () => ({ count: 1 })),
    },
    orderItem: {
      create: jest.fn(async ({ data }: any) => ({
        id: `item_${Math.random()}`,
        productSlug: "hd-banner",
        printSides: "single",
        finishings: data.finishings,
        configSnapshot: data.configSnapshot,
        artworkFileId: data.artworkFileId ?? null,
        createdAt: new Date(),
        ...data,
      })),
    },
    orderEvent: {
      create: jest.fn(async ({ data }: any) => ({ id: "evt1", emailed: false, createdAt: new Date(), ...data })),
    },
  };
  return { prisma, stored };
}

async function makeService(opts: { artworkOwnerOk?: boolean } = {}) {
  const { prisma, stored } = makePrismaMock();
  const moduleRef = await Test.createTestingModule({
    providers: [
      OrdersService,
      { provide: PrismaService, useValue: prisma },
      {
        provide: PricingEngineService,
        // Real engine math (shared constants) without the DB-rate loader.
        useValue: {
          priceLines: async (lines: Parameters<typeof import("@bannersin48/shared").priceOrder>[0]) =>
            (await import("@bannersin48/shared")).priceOrder(lines),
        },
      },
    ],
  })
    .useMocker((token) => {
      if (token === CatalogService) {
        return { getProductWithMaterials: jest.fn(async () => HD_ROW) };
      }
      if (token === DeliveryService) {
        return { estimate: jest.fn(() => ({ ...ESTIMATE })) };
      }
      if (token === ArtworkService) {
        return { assertUsableBy: jest.fn(async () => undefined) };
      }
      if (token === PricingService) {
        return { quote: jest.fn() };
      }
      if (token === AddressService) {
        return { assertToken: jest.fn((address) => ({ ...address, country: "US" })) };
      }
      return {};
    })
    .compile();

  // The generic mocker above can't key on the ArtworkService class token across
  // module boundaries reliably — override it directly on the resolved instance.
  const service = moduleRef.get(OrdersService);
  const artwork = (service as unknown as { artwork: { assertUsableBy: jest.Mock } }).artwork;
  artwork.assertUsableBy = jest.fn(async (_userId: string, artworkId: string) => {
    if (opts.artworkOwnerOk === false || artworkId === "art_foreign") {
      throw new BadRequestException({ code: "ARTWORK_INVALID", message: "Artwork does not exist in your library." });
    }
  });

  return { service, prisma, stored };
}

function validDto(overrides: Partial<CreateOrderDto> = {}): CreateOrderDto {
  return {
    email: "customer@example.com",
    lines: [
      {
        productId: "HD_BANNER",
        material: "VINYL_15OZ_SINGLE",
        dimensions: { widthFt: 3, widthIn: 0, heightFt: 6, heightIn: 0 },
        finishing: { welding: true, grommets: true },
        quantity: 1,
        artworkId: "art_ok",
        quoteId: "quote_ok",
      },
    ],
    shipTo: {
      fullName: "Smoke Tester",
      street1: "123 Main St",
      city: "Ypsilanti",
      region: "MI",
      postalCode: "48197",
      country: "US",
    },
    addressValidationToken: "address-token",
    addressRiskAcknowledged: true,
    acknowledgements: {
      artworkCorrect: true,
      spellingColorsLayoutAccepted: true,
      printsAsUploaded: true,
      cancellationWindowUnderstood: true,
      deliveryDateAndAddressConfirmed: true,
    },
    ...overrides,
  } as CreateOrderDto;
}

describe("OrdersService.create", () => {
  it("re-prices a known case server-side: 3×6 HD 15oz qty1 → $95.50", async () => {
    const { service } = await makeService();
    const detail = await service.create("user_1", validDto(), "203.0.113.9");
    expect(detail.subtotal).toBe(85.5);
    expect(detail.shipping).toBe(10);
    expect(detail.total).toBe(95.5);
    expect(detail.tax).toBe(0);
    expect(detail.orderNumber).toMatch(/^BI48-\d{6}$/);
    expect(detail.orderNumber).toBe("BI48-000007");
    expect(detail.status).toBe("RECEIVED");
    expect(detail.paymentStatus).toBe("PENDING_PAYMENT");
  });

  it("snapshots address, proof consent and per-line config", async () => {
    const { service, stored } = await makeService();
    const detail = await service.create("user_1", validDto(), "203.0.113.9");
    expect(detail.shipTo).toMatchObject({ fullName: "Smoke Tester", city: "Ypsilanti", country: "US" });
    expect(detail.proofConfirmedAt).toBeTruthy();
    expect(detail.lines[0]).toMatchObject({
      material: "VINYL_15OZ_SINGLE",
      billableSqFt: 18,
      totalBeforeTax: 95.5,
    });
    expect(detail.events).toHaveLength(1);
    expect(detail.events[0].toStatus).toBe("RECEIVED");

    const persisted = stored.order as Record<string, any>;
    expect(persisted.proofConsentTextVersion).toBeTruthy();
    expect(persisted.proofConfirmIp).toBe("203.0.113.9");
    expect(persisted.placedAt).toBeTruthy();
  });

  it("rejects an unverified address when risk acknowledgement is bypassed", async () => {
    const { service, prisma } = await makeService();
    const dto = validDto({ addressRiskAcknowledged: false });
    await expect(service.create("user_1", dto)).rejects.toMatchObject({
      response: { code: "ADDRESS_RISK_ACKNOWLEDGEMENT_REQUIRED" },
    });
    expect(prisma.order.create).not.toHaveBeenCalled();
  });

  it("rejects a missing artwork id even when DTO validation is bypassed", async () => {
    const { service } = await makeService();
    const dto = validDto();
    dto.lines[0].artworkId = "";
    await expect(service.create("user_1", dto)).rejects.toMatchObject({
      response: { code: "ARTWORK_REQUIRED" },
    });
  });

  it("rejects artwork that is not owned by / present for the user", async () => {
    const { service } = await makeService({ artworkOwnerOk: false });
    await expect(service.create("user_1", validDto())).rejects.toMatchObject({
      response: { code: "ARTWORK_INVALID" },
    });
  });

  it("rejects an expired quote before creating an order", async () => {
    const { service, prisma } = await makeService();
    prisma.quote.findUnique.mockResolvedValueOnce({
      id: "quote_ok",
      userId: null,
      request: {},
      breakdown: {},
      validUntil: new Date(Date.now() - 1_000),
    });
    await expect(service.create("user_1", validDto())).rejects.toMatchObject({
      status: 409,
      response: { code: "QUOTE_EXPIRED" },
    });
    expect(prisma.order.create).not.toHaveBeenCalled();
  });

  it("rejects a quote that does not match the submitted configuration", async () => {
    const { service } = await makeService();
    const dto = validDto();
    dto.lines[0].quantity = 2;
    await expect(service.create("user_1", dto)).rejects.toMatchObject({
      response: { code: "QUOTE_MISMATCH" },
    });
  });

  it("returns QUOTE_CHANGED and creates no order when current pricing differs", async () => {
    const { service, prisma } = await makeService();
    prisma.quote.findUnique.mockResolvedValueOnce({
      id: "quote_ok",
      userId: null,
      request: {
        productId: "HD_BANNER",
        material: "VINYL_15OZ_SINGLE",
        dimensions: { widthFt: 3, widthIn: 0, heightFt: 6, heightIn: 0 },
        finishing: { welding: true, grommets: true },
        quantity: 1,
      },
      breakdown: { lines: [{ totalBeforeTax: 90 }] },
      validUntil: new Date(Date.now() + 60_000),
    });
    const pricing = (service as unknown as { pricing: { quote: jest.Mock } }).pricing;
    pricing.quote.mockResolvedValue({ quoteId: "replacement" });

    await expect(service.create("user_1", validDto())).rejects.toMatchObject({
      status: 409,
      response: { code: "QUOTE_CHANGED" },
    });
    expect(prisma.order.create).not.toHaveBeenCalled();
  });

  it("rejects a material not offered on the product", async () => {
    const { service } = await makeService();
    const dto = validDto();
    dto.lines[0].material = "MESH_8OZ";
    await expect(service.create("user_1", dto)).rejects.toMatchObject({
      response: { code: "MATERIAL_NOT_OFFERED" },
    });
  });

  it("rejects out-of-range sizes", async () => {
    const { service } = await makeService();
    const dto = validDto();
    dto.lines[0].dimensions = { widthFt: 0, widthIn: 6, heightFt: 0, heightIn: 6 };
    await expect(service.create("user_1", dto)).rejects.toMatchObject({
      response: { code: "SIZE_TOO_SMALL" },
    });
  });
});

describe("status machine", () => {
  it("allows the standard fulfillment flow", () => {
    expect(() => assertTransition("RECEIVED", "IN_PROCESSING")).not.toThrow();
    expect(() => assertTransition("IN_PROCESSING", "ACCEPTED")).not.toThrow();
    expect(() => assertTransition("ACCEPTED", "SHIPPED")).not.toThrow();
    expect(() => assertTransition("SHIPPED", "DELIVERED")).not.toThrow();
  });

  it("forbids skipping or reversing states", () => {
    expect(() => assertTransition("RECEIVED", "SHIPPED")).toThrow(BadRequestException);
    expect(() => assertTransition("DELIVERED", "SHIPPED")).toThrow(BadRequestException);
    expect(() => assertTransition("CANCELLED", "RECEIVED")).toThrow(BadRequestException);
  });
});

describe("delivery commitment persistence (D6)", () => {
  it("persists the committed delivery date the first time an order enters IN_PROCESSING", async () => {
    const { service, prisma } = await makeService();
    prisma.order.findUnique.mockResolvedValueOnce({
      id: "ord_test1",
      status: "RECEIVED",
      paymentStatus: "MARKED_PAID",
      paymentConfirmedAt: null,
    });

    await service.transition("ord_test1", "IN_PROCESSING", { actorId: "staff_1", note: "paid" });

    expect(prisma.order.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: "ord_test1", status: "RECEIVED" }),
        data: expect.objectContaining({
          status: "IN_PROCESSING",
          paymentConfirmedAt: expect.any(Date),
          committedDeliveryDate: "2026-01-07",
          committedDeliveryDow: "Wednesday",
        }),
      }),
    );
  });

  it("does not recompute the commitment on later transitions", async () => {
    const { service, prisma } = await makeService();
    prisma.order.findUnique.mockResolvedValueOnce({
      id: "ord_test1",
      status: "IN_PROCESSING",
      paymentStatus: "MARKED_PAID",
      paymentConfirmedAt: new Date("2026-01-05T12:00:00Z"),
    });

    await service.transition("ord_test1", "ACCEPTED", { actorId: "staff_1" });

    expect(prisma.order.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.not.objectContaining({
          paymentConfirmedAt: expect.anything(),
          committedDeliveryDate: expect.anything(),
        }),
      }),
    );
  });
});

describe("order event timeline (C3 / L1)", () => {
  it("labels actors by role and never exposes staff or admin user ids to the customer", async () => {
    const { service } = await makeService();
    const order = {
      id: "ord_test1",
      userId: "cust_1",
      number: "BI48-000007",
      status: "IN_PROCESSING",
      paymentStatus: "MARKED_PAID",
      subtotal: "85.50",
      shippingAmount: "10.00",
      taxAmount: "0",
      total: "95.50",
      currency: "USD",
      shipAddress: {},
      placedAt: new Date("2026-01-05T12:00:00Z"),
      createdAt: new Date("2026-01-05T12:00:00Z"),
      updatedAt: new Date("2026-01-05T12:00:00Z"),
    } as never;
    const event = (id: string, actorId: string | null) =>
      ({ id, orderId: "ord_test1", fromStatus: null, toStatus: "RECEIVED", actorId, note: null, emailed: false, createdAt: new Date() }) as never;

    const detail = service.assembleDetail(order, [], [event("e1", "cust_1"), event("e2", "admin_secret_id"), event("e3", null)]);

    expect(detail.events.map((e) => e.actor)).toEqual(["customer", "staff", "system"]);
    expect(JSON.stringify(detail.events)).not.toContain("admin_secret_id");
    expect(detail.events.every((e) => !("actorId" in e))).toBe(true);
  });
});

describe("quote matching is canonical (H1)", () => {
  it("matches regardless of key order, explicit false flags or jsonb re-ordering", async () => {
    const { service, prisma } = await makeService();
    // Stored the way jsonb returns it: keys sorted by length, then bytewise.
    prisma.quote.findUnique.mockResolvedValueOnce({
      id: "quote_ok",
      userId: "user_1",
      request: {
        material: "VINYL_15OZ_SINGLE",
        quantity: 1,
        finishing: { rope: false, webbing: false, welding: true, grommets: true, windSlits: false, polePockets: false },
        productId: "HD_BANNER",
        dimensions: { widthFt: 3, widthIn: 0, heightFt: 6, heightIn: 0 },
      },
      breakdown: { lines: [{ totalBeforeTax: 95.5 }] },
      validUntil: new Date(Date.now() + 60_000),
    });
    const dto = validDto();
    dto.lines[0].dimensions = { heightIn: 0, heightFt: 6, widthIn: 0, widthFt: 3 } as never;
    dto.lines[0].finishing = { grommets: true, welding: true, rope: false } as never;
    await expect(service.create("user_1", dto)).resolves.toMatchObject({ total: 95.5 });
  });

  it("still rejects a changed finishing option", async () => {
    const { service } = await makeService();
    const dto = validDto();
    dto.lines[0].finishing = { welding: true, grommets: true, windSlits: true };
    await expect(service.create("user_1", dto)).rejects.toMatchObject({ response: { code: "QUOTE_MISMATCH" } });
  });

  it("rejects another user's quote but accepts an anonymous one", async () => {
    const { service, prisma } = await makeService();
    prisma.quote.findUnique.mockResolvedValueOnce({ id: "quote_ok", userId: "someone_else", request: {}, breakdown: {}, validUntil: new Date(Date.now() + 60_000) });
    await expect(service.create("user_1", validDto())).rejects.toMatchObject({ response: { code: "QUOTE_INVALID" } });
    await expect(service.create("user_1", validDto())).resolves.toBeTruthy(); // default mock: userId null
  });
});

describe("customer cancel is a compare-and-set", () => {
  it("only cancels while payment is still pending, and answers 409 if mark-paid won the race", async () => {
    const { service, prisma } = await makeService();
    prisma.order.findUnique.mockResolvedValue({
      id: "ord_test1",
      userId: "user_1",
      status: "RECEIVED",
      paymentStatus: "PENDING_PAYMENT",
      paymentConfirmedAt: null,
    });
    prisma.order.updateMany.mockResolvedValueOnce({ count: 0 }); // staff marked it paid in between

    await expect(service.cancel("user_1", "ord_test1")).rejects.toMatchObject({ status: 409, response: { code: "CONFLICT" } });
    expect(prisma.order.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { paymentStatus: "PENDING_PAYMENT", id: "ord_test1", status: "RECEIVED" },
        data: expect.objectContaining({ status: "CANCELLED" }),
      }),
    );
    expect(prisma.orderEvent.create).not.toHaveBeenCalled();
  });
});
