import { BadRequestException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { OrdersService } from "./orders.service";
import { CatalogService } from "../catalog/catalog.service";
import { DeliveryService } from "../delivery/delivery.service";
import { ArtworkService } from "../artwork/artwork.service";
import { PrismaService } from "../prisma/prisma.service";
import { PricingEngineService } from "../pricing/pricing-engine.service";
import { assertTransition } from "./status-machine";
import type { CreateOrderDto } from "./orders.dto";

/**
 * Order creation must reproduce the known pricing cases server-side
 * (3×6 HD Banner 15oz qty 1 → $85.50 product + $10 shipping = $95.50),
 * snapshot everything, validate artwork ownership, and enforce the
 * §4 status machine.
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
    order: {
      create: jest.fn(async ({ data }: any) => {
        Object.assign(stored, { order: data });
        return orderRow(data);
      }),
      findUnique: jest.fn(),
      findMany: jest.fn(async () => []),
      update: jest.fn(async ({ data, where }: any) => ({ id: where.id, status: data.status })),
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

  it("rejects artwork that is not owned by / present for the user", async () => {
    const { service } = await makeService({ artworkOwnerOk: false });
    await expect(service.create("user_1", validDto())).rejects.toMatchObject({
      response: { code: "ARTWORK_INVALID" },
    });
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
  it("allows the §4 flow", () => {
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
