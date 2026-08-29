import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { productIdForMaterial } from "@bannersin48/shared";
import { PricingEngineService } from "./pricing-engine.service";
import { PrismaService } from "../prisma/prisma.service";
import { CatalogService } from "../catalog/catalog.service";
import { DeliveryService } from "../delivery/delivery.service";
import type { FinishingDto } from "./quote-request.dto";
import type { QuoteRequestDto } from "./quote-request.dto";
import { assertMaterialOffered, assertSizeAllowed, normalizeFinishing } from "./catalog-rules";

const QUOTE_VALIDITY_DAYS = 14;

export interface QuoteResponse {
  quoteId: string;
  validUntil: string;
  currency: "USD";
  lines: unknown[];
  subtotal: number;
  shipping: number;
  tax: number;
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
    private readonly engine: PricingEngineService,
  ) {}

  async quote(dto: QuoteRequestDto): Promise<QuoteResponse> {
    const productCode = dto.productId ?? productIdForMaterial(dto.material as never);

    const product = await this.catalog.getProductWithMaterials(productCode);
    if (!product || !product.active) {
      throw new NotFoundException({ code: "NOT_FOUND", message: "Product not found." });
    }

    // The material must be offered on this product and the size must be in
    // range (DB-driven rules).
    assertMaterialOffered(product, dto.material);
    assertSizeAllowed(product, dto.dimensions);
    const dims = dto.dimensions;

    // Recompute through the shared engine using admin-editable DB rates.
    const finishing = normalizeFinishing(dto.finishing);
    const result = await this.engine.priceLines([
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
      validUntil: quote.validUntil!.toISOString(),
      currency: "USD",
      lines: result.lines,
      subtotal: result.subtotal,
      shipping: result.shipping,
      tax: 0,
      total: result.total,
      eligible: result.lines.every((l) => l.eligible),
      guaranteedDeliveryDate: estimate.guaranteedDeliveryDate,
      guaranteedDeliveryDow: estimate.guaranteedDeliveryDow,
      cutoffInMs: estimate.cutoffInMs,
      cutoffAtEt: estimate.cutoffAtEt,
    };
  }
}
