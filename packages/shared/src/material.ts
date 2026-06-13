import { z } from "zod";

/**
 * Material options from the plan §6.1.
 * - 13 oz vinyl banner: single-sided only
 * - 15 oz vinyl banner: single-sided only
 * - 18 oz vinyl banner: single-sided OR double-sided (only material that can be DS)
 */
export const materialSchema = z.enum([
  "VINYL_13OZ_SINGLE",
  "VINYL_15OZ_SINGLE",
  "VINYL_18OZ_SINGLE",
  "VINYL_18OZ_DOUBLE",
  "RETRACTABLE",
]);

export type Material = z.infer<typeof materialSchema>;

export interface MaterialInfo {
  id: Material;
  name: string;
  shortName: string;
  description: string;
  ratePerSqFt: number;
  doubleSided: boolean;
}

export const MATERIALS: ReadonlyArray<MaterialInfo> = [
  {
    id: "VINYL_13OZ_SINGLE",
    name: "13 oz Vinyl Banner",
    shortName: "13 oz",
    description: "Standard indoor / outdoor. Best for most uses.",
    ratePerSqFt: 4.0,
    doubleSided: false,
  },
  {
    id: "VINYL_15OZ_SINGLE",
    name: "15 oz Premium Vinyl Banner",
    shortName: "15 oz",
    description: "Premium durability for outdoor conditions.",
    ratePerSqFt: 4.75,
    doubleSided: false,
  },
  {
    id: "VINYL_18OZ_SINGLE",
    name: "18 oz Heavy-Duty Blockout Banner (Single-Sided)",
    shortName: "18 oz",
    description: "Heavy-duty blockout. Only material available double-sided.",
    ratePerSqFt: 5.25,
    doubleSided: false,
  },
  {
    id: "VINYL_18OZ_DOUBLE",
    name: "18 oz Heavy-Duty Blockout Banner (Double-Sided)",
    shortName: "18 oz DS",
    description: "Heavy-duty blockout, double-sided print. Premium option.",
    ratePerSqFt: 7.5,
    doubleSided: true,
  },
  {
    id: "RETRACTABLE",
    name: "Retractable Banner",
    shortName: "Retractable",
    description: "33.5\" × 80\" with hardware and carrying case included.",
    ratePerSqFt: 0,
    doubleSided: false,
  },
];

export function isRetractable(m: Material): boolean {
  return m === "RETRACTABLE";
}

export function isVinyl(m: Material): boolean {
  return m !== "RETRACTABLE";
}

export function materialInfo(m: Material): MaterialInfo {
  const found = MATERIALS.find((mi) => mi.id === m);
  if (!found) throw new Error(`Unknown material: ${m}`);
  return found;
}
