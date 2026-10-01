import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { DesignsService, MAX_DESIGNS_PER_USER } from "./designs.service";
import type { PrismaService } from "../prisma/prisma.service";
import type { CatalogService } from "../catalog/catalog.service";
import type { PricingService } from "../pricing/pricing.service";
import type { ArtworkService } from "../artwork/artwork.service";

type Row = Record<string, any>;

const HD_ROW = {
  id: "prod_hd",
  code: "HD_BANNER",
  slug: "hd-banner",
  name: "HD Banner",
  active: true,
  sizeMode: "CUSTOM",
  minWidthIn: 12,
  minHeightIn: 12,
  maxWidthIn: null,
  maxHeightIn: null,
  shortSideMaxIn: null,
  maxBillableFt: 10,
  materials: [{ code: "VINYL_13OZ_SINGLE" }, { code: "VINYL_18OZ_DOUBLE" }],
};

const CONFIG = {
  material: "VINYL_13OZ_SINGLE",
  dimensions: { widthFt: 8, widthIn: 0, heightFt: 4, heightIn: 0 },
  finishing: { grommets: true, welding: true },
  quantity: 2,
};

/** In-memory Prisma stand-in: saved_design rows with the product/artwork include resolved. */
function setup() {
  const designs: Row[] = [];
  let seq = 1;
  const withInclude = (row: Row) => ({
    ...row,
    product: { code: HD_ROW.code, slug: HD_ROW.slug, name: HD_ROW.name },
    artwork: row.artworkFileId ? { id: row.artworkFileId, deletedAt: row.artworkFileId === "art_gone" ? new Date() : null } : null,
  });
  const prisma: any = {
    savedDesign: {
      findMany: async ({ where }: Row) => designs.filter((d) => d.userId === where.userId).map(withInclude),
      findUnique: async ({ where }: Row) => {
        const row = designs.find((d) => d.id === where.id);
        return row ? withInclude(row) : null;
      },
      count: async ({ where }: Row) => designs.filter((d) => d.userId === where.userId).length,
      create: async ({ data }: Row) => {
        const row = { id: `design_${seq++}`, createdAt: new Date(), updatedAt: new Date(), ...data };
        designs.push(row);
        return withInclude(row);
      },
      update: async ({ where, data }: Row) => {
        const row = designs.find((d) => d.id === where.id)!;
        const { artwork, ...rest } = data;
        Object.assign(row, rest, { updatedAt: new Date() });
        if (artwork?.disconnect) row.artworkFileId = null;
        if (artwork?.connect) row.artworkFileId = artwork.connect.id;
        return withInclude(row);
      },
      delete: async ({ where }: Row) => {
        const i = designs.findIndex((d) => d.id === where.id);
        designs.splice(i, 1);
      },
    },
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn(prisma),
  };
  const catalog = { getProductWithMaterials: jest.fn(async (code: string) => (code === "HD_BANNER" || code === "hd-banner" ? HD_ROW : null)) };
  const pricing = { quote: jest.fn(async (dto: Row, userId: string) => ({ quoteId: "quote_1", total: 123.45, userId, request: dto })) };
  const artwork = {
    assertUsableBy: jest.fn(async (userId: string, id: string) => {
      if (!id.startsWith(`art_${userId}`)) throw new BadRequestException({ code: "ARTWORK_INVALID", message: "nope" });
    }),
    previewUrl: jest.fn((id: string) => `https://files.test/${id}/file?purpose=preview&sig=x`),
  };
  const service = new DesignsService(
    prisma as PrismaService,
    catalog as unknown as CatalogService,
    pricing as unknown as PricingService,
    artwork as unknown as ArtworkService,
  );
  return { service, designs, catalog, pricing, artwork };
}

describe("DesignsService", () => {
  it("creates a design with the canonical config, the product resolved by code, and a signed preview for owned artwork", async () => {
    const { service, artwork } = setup();
    const design = await service.create("u1", { name: "  Grand opening  ", productId: "HD_BANNER", config: CONFIG, artworkFileId: "art_u1_1" });
    expect(design).toMatchObject({
      name: "Grand opening",
      productId: "HD_BANNER",
      productSlug: "hd-banner",
      productName: "HD Banner",
      artworkFileId: "art_u1_1",
      previewUrl: expect.stringContaining("art_u1_1"),
    });
    // Finishing is normalised (every boolean explicit, only known keys); productId never lands inside config.
    expect(design.config).toEqual({
      material: "VINYL_13OZ_SINGLE",
      dimensions: { widthFt: 8, widthIn: 0, heightFt: 4, heightIn: 0 },
      finishing: { welding: true, grommets: true, windSlits: false, polePockets: false, rope: false, webbing: false },
      quantity: 2,
    });
    expect(artwork.assertUsableBy).toHaveBeenCalledWith("u1", "art_u1_1");
  });

  it("refuses unknown products, materials the product does not offer, and artwork the caller does not own", async () => {
    const { service } = setup();
    await expect(service.create("u1", { name: "x", productId: "NOPE", config: CONFIG })).rejects.toThrow(NotFoundException);
    await expect(service.create("u1", { name: "x", productId: "HD_BANNER", config: { ...CONFIG, material: "MESH_8OZ" } })).rejects.toMatchObject({
      response: { code: "MATERIAL_NOT_OFFERED" },
    });
    await expect(service.create("u1", { name: "x", productId: "HD_BANNER", config: CONFIG, artworkFileId: "art_u2_9" })).rejects.toMatchObject({
      response: { code: "ARTWORK_INVALID" },
    });
  });

  it("caps an account at the design quota", async () => {
    const { service, designs } = setup();
    for (let i = 0; i < MAX_DESIGNS_PER_USER; i++) designs.push({ id: `seed_${i}`, userId: "u1", name: `d${i}`, productId: "prod_hd", config: CONFIG, artworkFileId: null, createdAt: new Date(), updatedAt: new Date() });
    await expect(service.create("u1", { name: "one more", productId: "HD_BANNER", config: CONFIG })).rejects.toMatchObject({ response: { code: "DESIGN_QUOTA" } });
    // Another account is unaffected.
    await expect(service.create("u2", { name: "mine", productId: "HD_BANNER", config: CONFIG })).resolves.toMatchObject({ name: "mine" });
  });

  it("never reads, renames, deletes or quotes another user's design (404, not 403)", async () => {
    const { service, designs } = setup();
    const mine = await service.create("u1", { name: "mine", productId: "HD_BANNER", config: CONFIG });
    for (const attempt of [
      () => service.get("u2", mine.id),
      () => service.update("u2", mine.id, { name: "stolen" }),
      () => service.remove("u2", mine.id),
      () => service.quote("u2", mine.id),
      () => service.get("u2", ""),
    ]) {
      await expect(attempt()).rejects.toThrow(NotFoundException);
    }
    expect(designs).toHaveLength(1);
    expect(designs[0]!.name).toBe("mine");
    expect(await service.list("u2")).toEqual([]);
  });

  it("renames, replaces the configuration, attaches and detaches artwork", async () => {
    const { service } = setup();
    const design = await service.create("u1", { name: "v1", productId: "HD_BANNER", config: CONFIG });
    const renamed = await service.update("u1", design.id, { name: "v2" });
    expect(renamed.name).toBe("v2");
    const resized = await service.update("u1", design.id, { config: { ...CONFIG, quantity: 5, dimensions: { widthFt: 10, widthIn: 0, heightFt: 3, heightIn: 0 } } });
    expect(resized.config.quantity).toBe(5);
    expect(resized.config.dimensions.widthFt).toBe(10);
    const attached = await service.update("u1", design.id, { artworkFileId: "art_u1_7" });
    expect(attached.artworkFileId).toBe("art_u1_7");
    expect(attached.previewUrl).toContain("art_u1_7");
    const detached = await service.update("u1", design.id, { artworkFileId: null });
    expect(detached.artworkFileId).toBeNull();
    expect(detached.previewUrl).toBeNull();
    await expect(service.update("u1", design.id, { config: { ...CONFIG, material: "MESH_8OZ" } })).rejects.toMatchObject({ response: { code: "MATERIAL_NOT_OFFERED" } });
  });

  it("re-quotes through PricingService with the owner's id and returns a cart-ready line", async () => {
    const { service, pricing } = setup();
    const design = await service.create("u1", { name: "q", productId: "HD_BANNER", config: CONFIG, artworkFileId: "art_u1_1" });
    const result = await service.quote("u1", design.id);
    expect(pricing.quote).toHaveBeenCalledWith(expect.objectContaining({ productId: "HD_BANNER", material: "VINYL_13OZ_SINGLE", quantity: 2 }), "u1");
    expect(result).toMatchObject({
      designId: design.id,
      line: { productId: "HD_BANNER", material: "VINYL_13OZ_SINGLE", quantity: 2, artworkId: "art_u1_1" },
      quote: { quoteId: "quote_1", total: 123.45 },
    });
  });

  it("drops a deleted artwork file from the summary and the quoted line", async () => {
    const { service, designs } = setup();
    designs.push({ id: "d_gone", userId: "u1", name: "old", productId: "prod_hd", config: CONFIG, artworkFileId: "art_gone", createdAt: new Date(), updatedAt: new Date() });
    const [summary] = await service.list("u1");
    expect(summary).toMatchObject({ artworkFileId: null, previewUrl: null });
    expect((await service.quote("u1", "d_gone")).line.artworkId).toBeNull();
    await expect(service.remove("u1", "d_gone")).resolves.toBeUndefined();
    expect(designs).toHaveLength(0);
  });

  it("surfaces the quota as a 409 ConflictException", async () => {
    const { service, designs } = setup();
    for (let i = 0; i < MAX_DESIGNS_PER_USER; i++) designs.push({ id: `s${i}`, userId: "u1", name: "d", productId: "prod_hd", config: CONFIG, artworkFileId: null, createdAt: new Date(), updatedAt: new Date() });
    await expect(service.create("u1", { name: "x", productId: "HD_BANNER", config: CONFIG })).rejects.toThrow(ConflictException);
  });
});
