import { NotFoundException } from "@nestjs/common";
import { CatalogService } from "./catalog.service";

/** Serialization shape must match the MSW handlers exactly. */
const ROW = {
  id: "prod_hd",
  code: "HD_BANNER",
  slug: "hd-banner",
  name: "HD Banner",
  active: true,
  sort: 0,
  displayConfig: {
    title: "HD Banner",
    subtitle: "Premium vinyl banner in 13, 15, and 18 oz",
    hasMoreInfo: true,
    inHub: true,
    hubCopy: {
      commonUses: ["Business promotions"],
      environment: ["Indoor and outdoor"],
      options: ["13, 15, or 18 oz vinyl"],
    },
  },
};

describe("CatalogService serialization", () => {
  let service: CatalogService;
  const products = [ROW];

  beforeEach(() => {
    const prismaMock = {
      product: {
        findMany: jest.fn(async () => products.map((p) => ({ ...p }))),
        findUnique: jest.fn(async ({ where }: any) => {
          const found = products.find((p) => p.slug === where.slug);
          return found ? { ...found } : null;
        }),
        findFirst: jest.fn(async ({ where }: any) => {
          const found = products.find((p) => p.code === where.OR[0].code || p.slug === where.OR[1].slug);
          return found ? { ...found, materials: [] } : null;
        }),
      },
    };
    // Bypass DI — the service only depends on Prisma.
    service = new CatalogService(prismaMock as never);
  });

  it("list items match the MSW /catalog/banner shape", async () => {
    const list = await service.listBannerProducts();
    expect(list).toEqual([
      {
        id: "HD_BANNER",
        slug: "hd-banner",
        title: "HD Banner",
        subtitle: "Premium vinyl banner in 13, 15, and 18 oz",
        hasMoreInfo: true,
        route: "/order/hd-banner",
      },
    ]);
  });

  it("detail spreads hubCopy fields like the MSW handler", async () => {
    const detail = await service.getBannerProduct("hd-banner");
    expect(detail.id).toBe("HD_BANNER");
    expect(detail.commonUses).toEqual(["Business promotions"]);
    expect(detail.environment).toEqual(["Indoor and outdoor"]);
    expect(detail.options).toEqual(["13, 15, or 18 oz vinyl"]);
  });

  it("unknown slugs produce a NOT_FOUND error", async () => {
    await expect(service.getBannerProduct("nope")).rejects.toThrow(NotFoundException);
  });
});
