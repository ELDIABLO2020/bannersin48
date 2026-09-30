import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { PricingEngineService } from "./pricing-engine.service";
import { PrismaService } from "../prisma/prisma.service";
import { CatalogService } from "../catalog/catalog.service";
import { DeliveryService } from "../delivery/delivery.service";
import { assertMaterialOffered, assertSizeAllowed, canonicalQuoteRequest, type QuoteRequestInput } from "./catalog-rules";

export const QUOTE_VALIDITY_DAYS = 14;

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

  /**
   * `userId` is set when the caller is signed in (optional auth on POST /pricing/quote,
   * and always for order-flow re-quotes); anonymous builder quotes stay unowned so a
   * cart built before sign-in can still be checked out.
   */
  async quote(dto: QuoteRequestInput, userId?: string | null): Promise<QuoteResponse> {
    // Only the validated, normalised request is priced and persisted; never the raw body.
    const request = canonicalQuoteRequest(dto);
    const productCode = request.productId;

    const product = await this.catalog.getProductWithMaterials(productCode);
    if (!product || !product.active) {
      throw new NotFoundException({ code: "NOT_FOUND", message: "Product not found." });
    }

    // The material must be offered on this product and the size must be in
    // range (DB-driven rules).
    assertMaterialOffered(product, request.material);
    assertSizeAllowed(product, request.dimensions);

    // Recompute through the shared engine using admin-editable DB rates.
    const result = await this.engine.priceLines([
      {
        productId: productCode as never,
        material: request.material as never,
        dimensions: request.dimensions,
        finishing: request.finishing as never,
        quantity: request.quantity,
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

    // Persisted because orders reference quotes by id (QUOTE_INVALID / QUOTE_EXPIRED /
    // QUOTE_MISMATCH checks). Expired rows are purged daily (QuotePurgeService).
    const quote = await this.prisma.quote.create({
      data: {
        userId: userId ?? null,
        request: request as object,
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
