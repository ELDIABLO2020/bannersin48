import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { priceOrder, productIdForMaterial } from "@bannersin48/shared";
import { PrismaService } from "../prisma/prisma.service";
import { CatalogService } from "../catalog/catalog.service";
import { DeliveryService } from "../delivery/delivery.service";
import type { FinishingDto } from "./quote-request.dto";
import type { QuoteRequestDto } from "./quote-request.dto";

const QUOTE_VALIDITY_DAYS = 14;

export interface QuoteResponse {
  quoteId: string;
  lines: unknown[];
  subtotal: number;
  shipping: number;
  total: number;
  eligible: boolean;
  guaranteedDeliveryDate: string;
  guaranteedDeliveryDow: string;
  cutoffInMs: number;
  cutoffAtEt: string;
}

/**
 * Server-side pricing. The request is validated against DB-driven catalog
 * rules (active product, material offered on that product, size limits), then
 * the math is recomputed with the shared engine from @bannersin48/shared —
 * client-computed totals are never trusted.
 */
@Injectable()
export class PricingService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    private readonly catalog: CatalogService,
    private readonly delivery: DeliveryService,
  ) {}

  async quote(dto: QuoteRequestDto): Promise<QuoteResponse> {
    const productCode = dto.productId ?? productIdForMaterial(dto.material as never);

    const product = await this.catalog.getProductWithMaterials(productCode);
    if (!product || !product.active) {
      throw new NotFoundException({ code: "NOT_FOUND", message: "Product not found." });
    }

    // The material must be offered on this product (DB-driven rule).
    if (!product.materials.some((m) => m.code === dto.material)) {
      throw new BadRequestException({
        code: "MATERIAL_NOT_OFFERED",
        message: `Material ${dto.material} is not available for ${product.name}.`,
      });
    }

    // Size limits from the DB (seeded from the shared product configs).
    const dims = dto.dimensions;
    const widthIn = dims.widthFt * 12 + dims.widthIn;
    const heightIn = dims.heightFt * 12 + dims.heightIn;
    if (product.sizeMode === "CUSTOM") {
      const min = product.minWidthIn ?? 0;
      if (widthIn < min || heightIn < min) {
        throw new BadRequestException({ code: "SIZE_TOO_SMALL", message: 'The minimum size is 12" × 12".' });
      }
      const shortSideMax = product.shortSideMaxIn;
      if (shortSideMax && Math.min(widthIn, heightIn) > shortSideMax) {
        throw new BadRequestException({
          code: "SHORT_SIDE_TOO_LONG",
          message: `The shorter side of a ${product.name} can be at most ${shortSideMax}".`,
        });
      }
      const maxBillableFt = product.maxBillableFt;
      if (
        maxBillableFt &&
        (Math.ceil(widthIn / 12) > maxBillableFt || Math.ceil(heightIn / 12) > maxBillableFt)
      ) {
        throw new BadRequestException({
          code: "SIZE_TOO_LARGE",
          message: `Billable size exceeds the ${maxBillableFt} ft maximum. Please contact us for a custom quote.`,
        });
      }
    }

    // Recompute everything through the shared engine.
    const finishing = normalizeFinishing(dto.finishing);
    const result = priceOrder([
      {
        productId: productCode as never,
        material: dto.material as never,
        dimensions: dims,
        finishing: finishing as never,
        quantity: dto.quantity,
      },
    ]);

    const estimate = this.delivery.estimate();
    const line0 = result.lines[0]!;
    if (!line0.eligible) {
      throw new BadRequestException({
        code: "NOT_ELIGIBLE",
        message: line0.ineligibilityReason ?? "These dimensions are not eligible for online ordering.",
      });
    }

    // Persist the quote snapshot (§4 quotes table).
    const quote = await this.prisma.quote.create({
      data: {
        request: dto as object,
        breakdown: result as object,
        subtotal: result.subtotal.toFixed(2),
        total: result.total.toFixed(2),
        validUntil: new Date(Date.now() + QUOTE_VALIDITY_DAYS * 24 * 60 * 60 * 1000),
      },
    });

    return {
      quoteId: quote.id,
      lines: result.lines,
      subtotal: result.subtotal,
      shipping: result.shipping,
      total: result.total,
      eligible: result.lines.every((l) => l.eligible),
      guaranteedDeliveryDate: estimate.guaranteedDeliveryDate,
      guaranteedDeliveryDow: estimate.guaranteedDeliveryDow,
      cutoffInMs: estimate.cutoffInMs,
      cutoffAtEt: estimate.cutoffAtEt,
    };
  }
}

/** Apply engine defaults so partial finishing payloads behave like the builder. */
function normalizeFinishing(finishing?: FinishingDto) {
  return {
    welding: false,
    grommets: false,
    windSlits: false,
    polePockets: false,
    rope: false,
    webbing: false,
    ...finishing,
  };
}
