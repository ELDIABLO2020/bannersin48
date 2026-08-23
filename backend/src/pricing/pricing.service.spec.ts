import { Test } from "@nestjs/testing";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { PricingService } from "./pricing.service";
import { CatalogService } from "../catalog/catalog.service";
import { DeliveryService } from "../delivery/delivery.service";
import { PrismaService } from "../prisma/prisma.service";
import { PricingEngineService } from "./pricing-engine.service";
import type { QuoteRequestDto } from "./quote-request.dto";

/**
 * Quote math must reproduce the known cases from packages/shared pricing.test.ts
 * (plan §9.5 examples). The engine runs for real; only Prisma + catalog are faked.
 */
const HD_BANNER_DB_ROW = {
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
    { code: "VINYL_13OZ_SINGLE" },
    { code: "VINYL_15OZ_SINGLE" },
    { code: "VINYL_18OZ_SINGLE" },
    { code: "VINYL_18OZ_DOUBLE" },
  ],
};

function makeService(quoteCreate: jest.Mock) {
  // Default: echo the persisted row back with an id.
  if (!quoteCreate.getMockImplementation()) {
    quoteCreate.mockImplementation(async ({ data }: any) => ({ id: "quote_test", ...data }));
  }
  const catalogMock = {
    getProductWithMaterials: jest.fn(async (code: string) =>
      code === "HD_BANNER" ? HD_BANNER_DB_ROW : null,
    ),
  };
  return Test.createTestingModule({
    providers: [
      PricingService,
      {
        provide: PricingEngineService,
        useValue: {
          priceLines: async (lines: Parameters<typeof import("@bannersin48/shared").priceOrder>[0]) =>
            (await import("@bannersin48/shared")).priceOrder(lines),
        },
      },
    ],
  })
    .useMocker((token) => {
      if (token === CatalogService) return Object.assign(catalogMock);
      if (token === DeliveryService) {
        return {
          estimate: () => ({
            timezone: "America/New_York",
            currentEt: new Date().toISOString(),
            cutoffAtEt: new Date().toISOString(),
            cutoffInMs: 1000,
            guaranteedDeliveryDate: "2026-01-07",
            guaranteedDeliveryDow: "Wednesday",
            guaranteedDeliveryLocal: "12:00 PM",
            cycleIndex: 0,
          }),
        };
      }
      if (token === PrismaService) return {};
      return {};
    })
    .compile()
    .then((moduleRef) => {
      const prismaMock = { quote: { create: quoteCreate } };
      const service = moduleRef.get(PricingService);
      Object.defineProperty(service, "prisma", { value: prismaMock });
      return service;
    });
}

const dims = (wFt: number, wIn: number, hFt: number, hIn: number) => ({
  widthFt: wFt,
  widthIn: wIn,
  heightFt: hFt,
  heightIn: hIn,
});

describe("PricingService.quote — known cases", () => {
  it('3×6 HD Banner 15oz → $85.50 unit, $95.50 total', async () => {
    const create = jest.fn(async ({ data }: any) => ({ id: "quote_1", ...data }));
    const service = await makeService(create);

    const dto: QuoteRequestDto = {
      productId: "HD_BANNER",
      material: "VINYL_15OZ_SINGLE",
      dimensions: dims(3, 0, 6, 0),
      finishing: {},
      quantity: 1,
    };

    const res = await service.quote(dto);

    expect(res.subtotal).toBe(85.5); // 18 sqft × $4.75
    expect(res.shipping).toBe(10);
    expect(res.total).toBe(95.5);
    expect(res.eligible).toBe(true);
    expect(res.lines[0]).toEqual(
      expect.objectContaining({ billableSqFt: 18, billableDims: { widthFt: 3, heightFt: 6 } }),
    );
    // Quote persisted with correct totals as strings (Decimal).
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ subtotal: "85.50", total: "95.50" }),
      }),
    );
  });

  it("4×8 HD Banner 13oz qty 1 → $138 total", async () => {
    const service = await makeService(jest.fn());
    const res = await service.quote({
      productId: "HD_BANNER",
      material: "VINYL_13OZ_SINGLE",
      dimensions: dims(4, 0, 8, 0),
      finishing: {},
      quantity: 1,
    });
    expect(res.total).toBe(138);
  });

  it("2'1\" × 4'7\" rounds up to 3×5 billable sqft", async () => {
    const service = await makeService(jest.fn());
    const res = await service.quote({
      productId: "HD_BANNER",
      material: "VINYL_13OZ_SINGLE",
      dimensions: dims(2, 1, 4, 7),
      finishing: {},
      quantity: 1,
    });
    expect((res.lines[0] as any).billableSqFt).toBe(15);
    expect(res.total).toBe(70);
  });

  it("5×10 18oz double-sided qty 2 → $770 total", async () => {
    const service = await makeService(jest.fn());
    const res = await service.quote({
      productId: "HD_BANNER",
      material: "VINYL_18OZ_DOUBLE",
      dimensions: dims(5, 0, 10, 0),
      finishing: {},
      quantity: 2,
    });
    expect(res.total).toBe(770);
  });

  it("rejects materials not offered on the product", async () => {
    const service = await makeService(jest.fn());
    await expect(
      service.quote({
        productId: "HD_BANNER",
        material: "CANVAS_11OZ",
        dimensions: dims(3, 0, 6, 0),
        finishing: {},
        quantity: 1,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it("rejects unknown products", async () => {
    const service = await makeService(jest.fn());
    await expect(
      service.quote({
        material: "CANVAS_11OZ",
        dimensions: dims(3, 0, 6, 0),
        finishing: {},
        quantity: 1,
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it("rejects sizes below the DB minimum", async () => {
    const service = await makeService(jest.fn());
    await expect(
      service.quote({
        productId: "HD_BANNER",
        material: "VINYL_13OZ_SINGLE",
        dimensions: dims(0, 6, 0, 6),
        finishing: {},
        quantity: 1,
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
