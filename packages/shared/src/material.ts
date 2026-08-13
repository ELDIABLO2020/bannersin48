import { z } from "zod";
import { MATERIAL_RATES, PRODUCT_RATES } from "./constants";

/**
 * Material options from the plan §6.1 plus BANNER catalog products.
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
  "HDPE",
  "CANVAS_11OZ",
  "MESH_8OZ",
  "POSTER_8MIL",
  "NO_CURL_8MIL",
  "ECONOSTAND",
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
    ratePerSqFt: MATERIAL_RATES.VINYL_13OZ_SINGLE,
    doubleSided: false,
  },
  {
    id: "VINYL_15OZ_SINGLE",
    name: "15 oz Premium Vinyl Banner",
    shortName: "15 oz",
    description: "Premium durability for outdoor conditions.",
    ratePerSqFt: MATERIAL_RATES.VINYL_15OZ_SINGLE,
    doubleSided: false,
  },
  {
    id: "VINYL_18OZ_SINGLE",
    name: "18 oz Heavy-Duty Blockout Banner (Single-Sided)",
    shortName: "18 oz",
    description: "Heavy-duty blockout. Only material available double-sided.",
    ratePerSqFt: MATERIAL_RATES.VINYL_18OZ_SINGLE,
    doubleSided: false,
  },
  {
    id: "VINYL_18OZ_DOUBLE",
    name: "18 oz Heavy-Duty Blockout Banner (Double-Sided)",
    shortName: "18 oz DS",
    description: "Heavy-duty blockout, double-sided print. Premium option.",
    ratePerSqFt: MATERIAL_RATES.VINYL_18OZ_DOUBLE,
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
  {
    id: "HDPE",
    name: "HDPE Banner",
    shortName: "HDPE",
    description: "Lightweight, water- and tear-resistant banner material.",
    ratePerSqFt: PRODUCT_RATES.HDPE,
    doubleSided: false,
  },
  {
    id: "CANVAS_11OZ",
    name: "11 oz Poly-Cotton Canvas",
    shortName: "Canvas",
    description: "Gesso-finish canvas for stretching and framing.",
    ratePerSqFt: PRODUCT_RATES.CANVAS_11OZ,
    doubleSided: false,
  },
  {
    id: "MESH_8OZ",
    name: "8 oz Mesh Banner",
    shortName: "Mesh",
    description: "Perforated banner that lets wind pass through.",
    ratePerSqFt: PRODUCT_RATES.MESH_8OZ,
    doubleSided: false,
  },
  {
    id: "POSTER_8MIL",
    name: "8 mil Poster Paper",
    shortName: "Poster",
    description: "Smooth satin poster paper for short-term indoor use.",
    ratePerSqFt: PRODUCT_RATES.POSTER_8MIL,
    doubleSided: false,
  },
  {
    id: "NO_CURL_8MIL",
    name: "8 mil No-Curl Banner",
    shortName: "No-Curl",
    description: "Lays flat and stays flat, indoors or out.",
    ratePerSqFt: PRODUCT_RATES.NO_CURL_8MIL,
    doubleSided: false,
  },
  {
    id: "ECONOSTAND",
    name: "Econostand Banner Stand",
    shortName: "Econostand",
    description: '33.5" × 80" banner stand, hardware included.',
    ratePerSqFt: 0,
    doubleSided: false,
  },
];

export function isRetractable(m: Material): boolean {
  return m === "RETRACTABLE";
}

export function isVinyl(m: Material): boolean {
  return m.startsWith("VINYL_");
}

export function materialInfo(m: Material): MaterialInfo {
  const found = MATERIALS.find((mi) => mi.id === m);
  if (!found) throw new Error(`Unknown material: ${m}`);
  return found;
}
