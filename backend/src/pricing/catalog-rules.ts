import { BadRequestException } from "@nestjs/common";
import type { Product, ProductMaterial } from "@prisma/client";
import type { FinishingDto, DimensionsDto } from "./quote-request.dto";

/**
 * DB-driven catalog rules shared by the quote path and order creation:
 * material must be offered on the product; dimensions must respect the
 * product's min/max limits. Rates live in product_materials rows.
 */

export interface ProductWithMaterials extends Product {
  materials: ProductMaterial[];
}

export function normalizeFinishing(finishing?: FinishingDto) {
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
