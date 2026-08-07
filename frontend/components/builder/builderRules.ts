import type { Material } from "@bannersin48/shared";
import {
  isWindSlitsEligible,
  windSlitsIneligibilityReason,
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
  | "rope"
  | "grommets"
  | "pockets"
  | "wind";

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

export function getControlEligibility(
  control: BuilderControl,
  opts: { material: Material; size: SizeState; finishing: Finishing },
): ControlEligibility {
  const { material, size, finishing } = opts;
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
      if (finishing.rope) {
        return { enabled: false, reason: "Grommets cannot be combined with rope." };
      }
      return { enabled: true };

    case "rope":
      if (finishing.grommets) {
        return { enabled: false, reason: "Rope cannot be combined with grommets. Turn off grommets first." };
      }
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
    default:
      return material;
  }
}
