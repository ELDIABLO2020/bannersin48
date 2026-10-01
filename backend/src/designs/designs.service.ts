import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { ArtworkService } from "../artwork/artwork.service";
import { CatalogService } from "../catalog/catalog.service";
import { PricingService, type QuoteResponse } from "../pricing/pricing.service";
import { assertMaterialOffered, assertSizeAllowed, canonicalQuoteRequest, normalizeFinishing, type ProductWithMaterials } from "../pricing/catalog-rules";
import type { QuoteRequestDto } from "../pricing/quote-request.dto";
import type { CreateDesignDto, UpdateDesignDto } from "./designs.dto";

/** Plan §4.2: at most this many saved designs per account (`409 DESIGN_QUOTA`). */
export const MAX_DESIGNS_PER_USER = 50;

/** The stored `config` snapshot: the canonical quote request minus the product (a column). */
export interface DesignConfig {
  material: string;
  dimensions: { widthFt: number; widthIn: number; heightFt: number; heightIn: number };
  finishing: ReturnType<typeof normalizeFinishing>;
  quantity: number;
}

export interface SavedDesignSummary {
  id: string;
  name: string;
  /** Catalog product code (`HD_BANNER`), as quotes and orders use it. */
  productId: string;
  productSlug: string;
  productName: string;
  config: DesignConfig;
  artworkFileId: string | null;
  /** Signed 5-minute preview link when artwork is attached and still in the library. */
  previewUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

/** `POST /designs/:id/quote`: everything the cart needs for one line, priced at today's rates. */
export interface DesignQuoteResponse {
  designId: string;
  line: DesignConfig & { productId: string; artworkId: string | null };
  quote: QuoteResponse;
}

const DESIGN_INCLUDE = {
  product: { select: { code: true, slug: true, name: true } },
  artwork: { select: { id: true, deletedAt: true } },
} satisfies Prisma.SavedDesignInclude;

type DesignRow = Prisma.SavedDesignGetPayload<{ include: typeof DESIGN_INCLUDE }>;

/**
 * Saved designs (plan §4.2, task 3.2). Owner-scoped: another user's design
 * reads as 404, never 403 (same rule as addresses). Configurations are
 * validated against the live catalog on save; prices are never stored — a
 * design is re-quoted through PricingService when it is ordered.
 */
@Injectable()
export class DesignsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: CatalogService,
    private readonly pricing: PricingService,
    private readonly artwork: ArtworkService,
  ) {}

  async list(userId: string): Promise<SavedDesignSummary[]> {
    const rows = await this.prisma.savedDesign.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: MAX_DESIGNS_PER_USER,
      include: DESIGN_INCLUDE,
    });
    return rows.map((r) => this.serialize(r));
  }

  async get(userId: string, designId: string): Promise<SavedDesignSummary> {
    return this.serialize(await this.loadOwned(userId, designId));
  }

  async create(userId: string, dto: CreateDesignDto): Promise<SavedDesignSummary> {
    const product = await this.loadProduct(dto.productId);
    const config = this.validateConfig(product, dto.config);
    if (dto.artworkFileId) await this.artwork.assertUsableBy(userId, dto.artworkFileId);

    const row = await this.prisma.$transaction(async (tx) => {
      const count = await tx.savedDesign.count({ where: { userId } });
      if (count >= MAX_DESIGNS_PER_USER) {
        throw new ConflictException({
          code: "DESIGN_QUOTA",
          message: `You can keep up to ${MAX_DESIGNS_PER_USER} saved designs. Delete one you no longer need.`,
        });
      }
      return tx.savedDesign.create({
        data: {
          userId,
          name: dto.name.trim(),
          productId: product.id,
          config: config as object,
          artworkFileId: dto.artworkFileId ?? null,
        },
        include: DESIGN_INCLUDE,
      });
    });
    return this.serialize(row);
  }

  async update(userId: string, designId: string, dto: UpdateDesignDto): Promise<SavedDesignSummary> {
    const existing = await this.loadOwned(userId, designId);
    const data: Prisma.SavedDesignUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.config !== undefined) {
      const product = await this.loadProduct(existing.product.code);
      data.config = this.validateConfig(product, dto.config) as object;
    }
    if (dto.artworkFileId !== undefined) {
      if (dto.artworkFileId === null) {
        data.artwork = { disconnect: true };
      } else {
        await this.artwork.assertUsableBy(userId, dto.artworkFileId);
        data.artwork = { connect: { id: dto.artworkFileId } };
      }
    }
    const row = await this.prisma.savedDesign.update({ where: { id: designId }, data, include: DESIGN_INCLUDE });
    return this.serialize(row);
  }

  async remove(userId: string, designId: string): Promise<void> {
    await this.loadOwned(userId, designId);
    await this.prisma.savedDesign.delete({ where: { id: designId } });
  }

  /** Re-prices the saved configuration at today's rates (like reorder). Never creates an order. */
  async quote(userId: string, designId: string): Promise<DesignQuoteResponse> {
    const row = await this.loadOwned(userId, designId);
    const config = row.config as unknown as DesignConfig;
    const quote = await this.pricing.quote({ productId: row.product.code, ...config }, userId);
    const artworkId = row.artwork && !row.artwork.deletedAt ? row.artwork.id : null;
    return { designId: row.id, line: { productId: row.product.code, ...config, artworkId }, quote };
  }

  // --- Internals ------------------------------------------------------------

  private async loadOwned(userId: string, designId: string): Promise<DesignRow> {
    const row = designId ? await this.prisma.savedDesign.findUnique({ where: { id: designId }, include: DESIGN_INCLUDE }) : null;
    if (!row || row.userId !== userId) {
      throw new NotFoundException({ code: "NOT_FOUND", message: "Design not found." });
    }
    return row;
  }

  private async loadProduct(codeOrSlug: string): Promise<ProductWithMaterials> {
    const product = await this.catalog.getProductWithMaterials(codeOrSlug);
    if (!product || !product.active) {
      throw new NotFoundException({ code: "NOT_FOUND", message: "Product not found." });
    }
    return product;
  }

  /** Same catalog rules as a quote, so a saved design can always be re-priced. */
  private validateConfig(product: ProductWithMaterials, input: QuoteRequestDto): DesignConfig {
    assertMaterialOffered(product, input.material);
    assertSizeAllowed(product, input.dimensions);
    const { productId: _ignored, ...config } = canonicalQuoteRequest({ ...input, productId: product.code });
    return config;
  }

  private serialize(row: DesignRow): SavedDesignSummary {
    const artworkId = row.artwork && !row.artwork.deletedAt ? row.artwork.id : null;
    return {
      id: row.id,
      name: row.name,
      productId: row.product.code,
      productSlug: row.product.slug,
      productName: row.product.name,
      config: row.config as unknown as DesignConfig,
      artworkFileId: artworkId,
      previewUrl: artworkId ? this.artwork.previewUrl(artworkId) : null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
