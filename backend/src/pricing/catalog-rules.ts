import { BadRequestException } from "@nestjs/common";
import type { Product, ProductMaterial } from "@prisma/client";
import { productIdForMaterial } from "@bannersin48/shared";
import type { FinishingDto, DimensionsDto } from "./quote-request.dto";

/**
 * DB-driven catalog rules shared by the quote path and order creation:
 * material must be offered on the product; dimensions must respect the
 * product's min/max limits. Rates live in product_materials rows.
 */

export interface ProductWithMaterials extends Product {
  materials: ProductMaterial[];
}

type FinishingInput = Partial<Omit<FinishingDto, "grommetPoints">> & {
  grommetPoints?: ReadonlyArray<{ xIn: number; yIn: number }>;
};

/**
 * The finishing object the engine prices and snapshots store: every boolean
 * explicit, only known keys, fixed key order. Anything else in the input
 * (including extra keys from legacy persisted quotes) is dropped.
 */
export function normalizeFinishing(finishing?: FinishingInput | null) {
  const f = finishing ?? {};
  const out: {
    welding: boolean;
    grommets: boolean;
    windSlits: boolean;
    polePockets: boolean;
    rope: boolean;
    webbing: boolean;
    polePocketPlacement?: string;
    polePocketDepthIn?: number;
    ropePlacement?: string;
    grommetPreset?: string;
    grommetSpacing?: string;
    grommetPoints?: Array<{ xIn: number; yIn: number }>;
  } = {
    welding: f.welding === true,
    grommets: f.grommets === true,
    windSlits: f.windSlits === true,
    polePockets: f.polePockets === true,
    rope: f.rope === true,
    webbing: f.webbing === true,
  };
  if (f.polePocketPlacement != null) out.polePocketPlacement = f.polePocketPlacement;
  if (f.polePocketDepthIn != null) out.polePocketDepthIn = f.polePocketDepthIn;
  if (f.ropePlacement != null) out.ropePlacement = f.ropePlacement;
  if (f.grommetPreset != null) out.grommetPreset = f.grommetPreset;
  if (f.grommetSpacing != null) out.grommetSpacing = f.grommetSpacing;
  if (f.grommetPoints != null) out.grommetPoints = f.grommetPoints.map((p) => ({ xIn: p.xIn, yIn: p.yIn }));
  return out;
}

export interface QuoteRequestInput {
  productId?: string | null;
  material: string;
  dimensions: DimensionsDto;
  finishing?: FinishingInput | null;
  quantity: number;
}

/**
 * What a quote row stores in `request`, and what order creation compares a line
 * against: the validated request with the product resolved and a fixed key order,
 * so the comparison does not depend on how the client (or jsonb) ordered keys.
 */
export function canonicalQuoteRequest(input: QuoteRequestInput) {
  const d = input.dimensions;
  return {
    productId: input.productId ?? productIdForMaterial(input.material as never),
    material: input.material,
    dimensions: { widthFt: d.widthFt, widthIn: d.widthIn, heightFt: d.heightFt, heightIn: d.heightIn },
    finishing: normalizeFinishing(input.finishing),
    quantity: input.quantity,
  };
}

export type CanonicalQuoteRequest = ReturnType<typeof canonicalQuoteRequest>;

export function assertMaterialOffered(product: ProductWithMaterials, material: string): void {
  if (!product.materials.some((m) => m.code === material)) {
    throw new BadRequestException({
      code: "MATERIAL_NOT_OFFERED",
      message: `Material ${material} is not available for ${product.name}.`,
    });
  }
}

export function assertSizeAllowed(product: ProductWithMaterials, dims: DimensionsDto): void {
  const widthIn = dims.widthFt * 12 + dims.widthIn;
  const heightIn = dims.heightFt * 12 + dims.heightIn;
  if (product.sizeMode === "FIXED") return; // fixed-size products ignore custom dims

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
  if (maxBillableFt && (Math.ceil(widthIn / 12) > maxBillableFt || Math.ceil(heightIn / 12) > maxBillableFt)) {
    throw new BadRequestException({
      code: "SIZE_TOO_LARGE",
      message: `Billable size exceeds the ${maxBillableFt} ft maximum. Please contact us for a custom quote.`,
    });
  }
}
