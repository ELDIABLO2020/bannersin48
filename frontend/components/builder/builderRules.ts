import type { Material, ProductId } from "@bannersin48/shared";
import {
  isWindSlitsEligible,
  windSlitsIneligibilityReason,
  PRODUCTS,
  type Dimensions,
  type Finishing,
} from "@bannersin48/shared";
import type { SizeState } from "@/lib/stores/configurator";

export type BuilderControl =
  | "images"
  | "size"
  | "material"
  | "sides"
  | "welding"
  | "webbing"
  | "rope"
  | "grommets"
  | "pockets"
  | "wind";

const DOCK_FLAG: Partial<Record<BuilderControl, keyof (typeof PRODUCTS)[ProductId]["dock"]>> = {
  material: "material",
  sides: "sides",
  welding: "welding",
  webbing: "webbing",
  rope: "rope",
  grommets: "grommets",
  pockets: "polePockets",
  wind: "windSlits",
};

const TILE_ORDER: BuilderControl[] = [
  "images",
  "size",
  "material",
  "sides",
  "welding",
  "webbing",
  "rope",
  "grommets",
  "pockets",
  "wind",
];

export interface ControlEligibility {
  enabled: boolean;
  reason?: string;
}

export function sizeToDimensions(size: SizeState): Dimensions {
  return {
    widthFt: size.widthFt,
    widthIn: size.widthIn,
    heightFt: size.heightFt,
    heightIn: size.heightIn,
  };
}

/** Double-sided print is only offered on 18oz (VINYL_18OZ_DOUBLE). */
export function canSelectDoubleSided(material: Material): boolean {
  return material === "VINYL_18OZ_DOUBLE" || material === "VINYL_18OZ_SINGLE";
}

export function isDoubleSided(material: Material): boolean {
  return material === "VINYL_18OZ_DOUBLE";
}

export function materialForPrintSides(current: Material, doubleSided: boolean): Material {
  if (doubleSided) return "VINYL_18OZ_DOUBLE";
  if (current === "VINYL_18OZ_DOUBLE") return "VINYL_18OZ_SINGLE";
  return current;
}

export function visibleTiles(productId: ProductId): BuilderControl[] {
  const config = PRODUCTS[productId];
  return TILE_ORDER.filter((control) => {
    if (control === "images") return true;
    if (control === "size") return config.sizeMode === "custom";
    const flag = DOCK_FLAG[control];
    return flag ? config.dock[flag] : false;
  });
}

export function getControlEligibility(
  control: BuilderControl,
  opts: { productId: ProductId; material: Material; size: SizeState; finishing: Finishing },
): ControlEligibility {
  const { productId, material, size, finishing } = opts;
  const config = PRODUCTS[productId];
  const flag = DOCK_FLAG[control];
  if (flag && !config.dock[flag]) {
    return { enabled: false, reason: "Not available for this product." };
  }

  const dims = sizeToDimensions(size);

  switch (control) {
    case "sides":
      if (material === "VINYL_13OZ_SINGLE" || material === "VINYL_15OZ_SINGLE") {
        return {
          enabled: false,
          reason: "Double-sided printing is only available on 18 oz vinyl.",
        };
      }
      return { enabled: true };

    case "welding":
      if (finishing.polePockets) {
        return { enabled: false, reason: "Welding is unavailable when pole pockets are selected." };
      }
      return { enabled: true };

    case "grommets":
      if (finishing.polePockets) {
        return { enabled: false, reason: "Grommets are unavailable when pole pockets are selected." };
      }
      return { enabled: true };

    case "rope":
      return { enabled: true };

    case "webbing":
      return { enabled: true };

    case "pockets":
      return { enabled: true };

    case "wind": {
      if (!isWindSlitsEligible(dims)) {
        return { enabled: false, reason: windSlitsIneligibilityReason(dims) };
      }
      return { enabled: true };
    }

    default:
      return { enabled: true };
  }
}

export function materialLabel(material: Material): string {
  switch (material) {
    case "VINYL_13OZ_SINGLE":
      return "13 oz single-sided";
    case "VINYL_15OZ_SINGLE":
      return "15 oz single-sided";
    case "VINYL_18OZ_SINGLE":
      return "18 oz single-sided";
    case "VINYL_18OZ_DOUBLE":
      return "18 oz double-sided";
    case "RETRACTABLE":
      return "Retractable";
    case "HDPE":
      return "HDPE";
    case "CANVAS_11OZ":
      return "11 oz canvas";
    case "MESH_8OZ":
      return "8 oz mesh";
    case "POSTER_8MIL":
      return "8 mil poster paper";
    case "NO_CURL_8MIL":
      return "8 mil no-curl";
    case "ECONOSTAND":
      return "Econostand";
    default:
      return material;
  }
}
