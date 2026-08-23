import { Injectable } from "@nestjs/common";
import {
  priceLine,
  productIdForMaterial,
  type PricingInput,
  type PricingResult,
} from "@bannersin48/shared";
import { billableDimensions } from "@bannersin48/shared";
import { PrismaService } from "../prisma/prisma.service";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

interface LoadedCatalog {
  /** product.code → product.id (DB id, for tier matching) */
  productIdByCode: Map<string, string>;
  rates: Parameters<typeof priceLine>[1];
  tiers: Array<{
    productId: string | null;
    materialCode: string | null;
    minBillableSqft: number;
    rates: Record<string, unknown>;
  }>;
}

/**
 * Loads admin-editable catalog rates from the DB and feeds them into the
 * shared pricing engine, so pricing changes hit new quotes/orders immediately
 * while existing orders keep their snapshots.
 */
@Injectable()
export class PricingEngineService {
  constructor(private readonly prisma: PrismaService) {}

  async priceLines(lines: PricingInput[]): Promise<PricingResult> {
    if (lines.length === 0) {
      return { lines: [], subtotal: 0, shipping: 0, total: 0 };
    }
    const catalog = await this.loadCatalog(lines);

    const priced = lines.map((line) => {
      let rates = catalog.rates;
      const code = line.productId ?? productIdForMaterial(line.material);
      const productId = catalog.productIdByCode.get(code);
      const billable = billableDimensions(line.dimensions);

      // Highest min-billable-sqft matching tier wins; product match beats "any".
      const tier = catalog.tiers.find(
        (t) =>
          Number(t.minBillableSqft) <= billable.sqFt &&
          (t.materialCode === null || t.materialCode === line.material) &&
          (t.productId === null || t.productId === productId),
      );
      const tierRate = tier ? tier.rates[line.material] : undefined;
      if (typeof tierRate === "number") {
        rates = {
          ...rates,
          materialRatePerSqft: {
            ...rates?.materialRatePerSqft,
            [line.material]: tierRate,
          },
        };
      }
      return priceLine(line, rates);
    });

    const subtotal = round2(priced.reduce((acc, l) => acc + l.productSubtotal, 0));
    const shipping = round2(priced.reduce((acc, l) => acc + l.shipping, 0));
    return { lines: priced, subtotal, shipping, total: round2(subtotal + shipping) };
  }

  private async loadCatalog(lines: PricingInput[]): Promise<LoadedCatalog> {
    const codes = new Set<string>();
    for (const line of lines) codes.add(line.productId ?? productIdForMaterial(line.material));

    const products = await this.prisma.product.findMany({
      where: { code: { in: [...codes] }, active: true },
      include: { materials: { where: { active: true } } },
    });
    const productIdByCode = new Map(products.map((p) => [p.code, p.id]));

    const materialRatePerSqft: Record<string, number> = {};
    const flatPriceUsdByProduct: Record<string, number> = {};
    for (const p of products) {
      for (const m of p.materials) {
        materialRatePerSqft[m.code] = Number(m.ratePerSqft);
      }
      if (p.sizeMode === "FIXED" && p.materials[0]?.flatPriceUsd) {
        flatPriceUsdByProduct[p.code] = Number(p.materials[0].flatPriceUsd);
      }
    }

    const finishings = await this.prisma.finishingOption.findMany({ where: { active: true } });
    const addonPerSqft: Record<string, number> = {};
    let webbingPerWidthFtPerEdge: number | undefined;
    for (const f of finishings) {
      const amount = Number(f.amount);
      if (f.priceModel === "PER_SQFT") {
        if (f.code === "wind_slits") addonPerSqft.windSlits = amount;
        else if (f.code === "pole_pockets") addonPerSqft.polePockets = amount;
        else if (f.code === "rope") addonPerSqft.rope = amount;
      } else if (f.priceModel === "PER_FT" && f.code === "webbing") {
        webbingPerWidthFtPerEdge = amount;
      }
    }

    const tierRows = await this.prisma.volumeTier.findMany();
    const tiers = tierRows
      .map((t) => ({
        productId: t.productId,
        materialCode: t.materialCode,
        minBillableSqft: Number(t.minBillableSqft),
        rates: ((t.rates ?? {}) as Record<string, unknown>) as Record<string, unknown>,
      }))
      .sort((a, b) => b.minBillableSqft - a.minBillableSqft);

    return {
      productIdByCode,
      rates: {
        materialRatePerSqft,
        flatPriceUsdByProduct,
        addonPerSqft: {
          windSlits: addonPerSqft.windSlits,
          polePockets: addonPerSqft.polePockets,
          rope: addonPerSqft.rope,
        },
        webbingPerWidthFtPerEdge,
      },
      tiers,
    };
  }
}
