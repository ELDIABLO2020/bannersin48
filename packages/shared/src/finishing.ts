import { z } from "zod";
import {
  POLE_POCKET_INCOMPAT_MESSAGE,
  ROPE_GROMMET_INCOMPAT_MESSAGE,
  WIND_SLITS_MIN_IN,
  WIND_SLITS_MAX_IN,
} from "./constants";
import type { Dimensions } from "./dimensions";

/**
 * Finishing options — plan §8 + Vinyl Builder parity.
 * Pole pockets ⊥ welding + grommets.
 * Rope ⊥ grommets.
 * Wind slits gated by size band (both dims > 24" and < 120").
 */

export const polePocketPlacementSchema = z.enum([
  "RIGHT",
  "LEFT",
  "LEFT_AND_RIGHT",
  "BOTTOM",
  "TOP",
  "TOP_AND_BOTTOM",
]);

export type PolePocketPlacement = z.infer<typeof polePocketPlacementSchema>;

export const polePocketDepthSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
]);

export type PolePocketDepthIn = z.infer<typeof polePocketDepthSchema>;

export const ropePlacementSchema = z.enum(["TOP", "BOTTOM", "TOP_AND_BOTTOM"]);
export type RopePlacement = z.infer<typeof ropePlacementSchema>;

export const grommetPresetSchema = z.enum([
  "CORNERS",
  "TOP_AND_BOTTOM",
  "ALL_SIDES",
  "CUSTOM",
]);
export type GrommetPreset = z.infer<typeof grommetPresetSchema>;

export const grommetSpacingSchema = z.enum(["EVERY_2FT", "EVERY_3FT", "EVERY_2_3FT"]);
export type GrommetSpacing = z.infer<typeof grommetSpacingSchema>;

export const grommetPointSchema = z
  .object({
    xIn: z.number().nonnegative(),
    yIn: z.number().nonnegative(),
  })
  .strict();

export type GrommetPoint = z.infer<typeof grommetPointSchema>;

export const finishingSchema = z
  .object({
    welding: z.boolean(),
    grommets: z.boolean(),
    windSlits: z.boolean(),
    polePockets: z.boolean(),
    polePocketPlacement: polePocketPlacementSchema.optional(),
    polePocketDepthIn: polePocketDepthSchema.optional(),
    rope: z.boolean(),
    ropePlacement: ropePlacementSchema.optional(),
    grommetPreset: grommetPresetSchema.optional(),
    grommetSpacing: grommetSpacingSchema.optional(),
    grommetPoints: z.array(grommetPointSchema).optional(),
    webbing: z.boolean().optional().default(false),
  })
  .strict()
  .superRefine((val, ctx) => {
    if (val.polePockets && !val.polePocketPlacement) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["polePocketPlacement"],
        message: "Select a pole pocket placement.",
      });
    }
    if (val.polePockets && !val.polePocketDepthIn) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["polePocketDepthIn"],
        message: "Select a pole pocket depth (1–4 inches).",
      });
    }
    if (!val.polePockets && val.polePocketPlacement) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["polePocketPlacement"],
        message: "Pole pocket placement requires pole pockets to be enabled.",
      });
    }
    if (!val.polePockets && val.polePocketDepthIn) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["polePocketDepthIn"],
        message: "Pole pocket depth requires pole pockets to be enabled.",
      });
    }
    if (val.polePockets && (val.grommets || val.welding)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: POLE_POCKET_INCOMPAT_MESSAGE,
      });
    }
    if (val.rope && val.grommets) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: ROPE_GROMMET_INCOMPAT_MESSAGE,
      });
    }
    if (val.rope && !val.ropePlacement) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["ropePlacement"],
        message: "Select a rope placement.",
      });
    }
    if (!val.rope && val.ropePlacement) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["ropePlacement"],
        message: "Rope placement requires rope to be enabled.",
      });
    }
  });

export type Finishing = z.infer<typeof finishingSchema>;

export const DEFAULT_FINISHING: Finishing = {
  welding: true,
  grommets: true,
  windSlits: false,
  polePockets: false,
  polePocketPlacement: undefined,
  polePocketDepthIn: undefined,
  rope: false,
  ropePlacement: undefined,
  grommetPreset: "TOP_AND_BOTTOM",
  grommetSpacing: "EVERY_2_3FT",
  grommetPoints: undefined,
  webbing: false,
};

export interface PolePocketPlacementOption {
  id: PolePocketPlacement;
  label: string;
}

export const POLE_POCKET_PLACEMENT_OPTIONS: ReadonlyArray<PolePocketPlacementOption> = [
  { id: "TOP", label: "Top only" },
  { id: "BOTTOM", label: "Bottom only" },
  { id: "TOP_AND_BOTTOM", label: "Top and bottom" },
  { id: "LEFT", label: "Left only" },
  { id: "RIGHT", label: "Right only" },
  { id: "LEFT_AND_RIGHT", label: "Left and right" },
];

export const POLE_POCKET_DEPTH_OPTIONS: ReadonlyArray<{ id: PolePocketDepthIn; label: string }> = [
  { id: 1, label: '1"' },
  { id: 2, label: '2"' },
  { id: 3, label: '3"' },
  { id: 4, label: '4"' },
];

export const ROPE_PLACEMENT_OPTIONS: ReadonlyArray<{ id: RopePlacement; label: string }> = [
  { id: "TOP", label: "Top" },
  { id: "BOTTOM", label: "Bottom" },
  { id: "TOP_AND_BOTTOM", label: "Top and bottom" },
];

export const GROMMET_PRESET_OPTIONS: ReadonlyArray<{ id: GrommetPreset; label: string }> = [
  { id: "CORNERS", label: "Corners only" },
  { id: "TOP_AND_BOTTOM", label: "Top & bottom" },
  { id: "ALL_SIDES", label: "All sides" },
  { id: "CUSTOM", label: "Custom" },
];

export const GROMMET_SPACING_OPTIONS: ReadonlyArray<{ id: GrommetSpacing; label: string }> = [
  { id: "EVERY_2FT", label: "Every 2 ft" },
  { id: "EVERY_3FT", label: "Every 3 ft" },
  { id: "EVERY_2_3FT", label: "Every 2–3 ft" },
];

export interface FinishingNormalization {
  finishing: Finishing;
  message?: string;
}

/** Total inches for a single axis from feet + leftover inches. */
export function axisInches(ft: number, inches: number): number {
  return ft * 12 + inches;
}

/** Banner width/height in inches from Dimensions. */
export function dimensionsToInches(d: Dimensions): { widthIn: number; heightIn: number } {
  return {
    widthIn: axisInches(d.widthFt, d.widthIn),
    heightIn: axisInches(d.heightFt, d.heightIn),
  };
}

/**
 * Wind slits only when both dimensions are strictly greater than 24" and strictly less than 120".
 */
export function isWindSlitsEligible(d: Dimensions): boolean {
  const { widthIn, heightIn } = dimensionsToInches(d);
  return (
    widthIn > WIND_SLITS_MIN_IN &&
    widthIn < WIND_SLITS_MAX_IN &&
    heightIn > WIND_SLITS_MIN_IN &&
    heightIn < WIND_SLITS_MAX_IN
  );
}

export function windSlitsIneligibilityReason(d: Dimensions): string | undefined {
  if (isWindSlitsEligible(d)) return undefined;
  const { widthIn, heightIn } = dimensionsToInches(d);
  return `Wind slits require both dimensions greater than ${WIND_SLITS_MIN_IN}" and less than ${WIND_SLITS_MAX_IN}" (current: ${widthIn}" × ${heightIn}").`;
}

/** Clamp a grommet point inside the banner, inset by `marginIn` from each edge. */
export function clampGrommetPoint(
  point: GrommetPoint,
  widthIn: number,
  heightIn: number,
  marginIn = 0.5,
): GrommetPoint {
  const maxX = Math.max(marginIn, widthIn - marginIn);
  const maxY = Math.max(marginIn, heightIn - marginIn);
  return {
    xIn: Math.min(maxX, Math.max(marginIn, point.xIn)),
    yIn: Math.min(maxY, Math.max(marginIn, point.yIn)),
  };
}

/**
 * Generate default grommet points for a preset + spacing on a banner of given size.
 */
export function generateGrommetPoints(
  widthIn: number,
  heightIn: number,
  preset: GrommetPreset,
  spacing: GrommetSpacing,
): GrommetPoint[] {
  const margin = 0.5;
  const step =
    spacing === "EVERY_2FT" ? 24 : spacing === "EVERY_3FT" ? 36 : 30; // 2–3 ft ≈ 30"

  const corners: GrommetPoint[] = [
    { xIn: margin, yIn: margin },
    { xIn: widthIn - margin, yIn: margin },
    { xIn: margin, yIn: heightIn - margin },
    { xIn: widthIn - margin, yIn: heightIn - margin },
  ];

  if (preset === "CORNERS" || preset === "CUSTOM") {
    return corners.map((p) => clampGrommetPoint(p, widthIn, heightIn, margin));
  }

  const along = (length: number): number[] => {
    const pts: number[] = [margin];
    for (let x = margin + step; x < length - margin - 0.01; x += step) {
      pts.push(x);
    }
    const end = length - margin;
    if (pts[pts.length - 1]! < end - 0.01) pts.push(end);
    return pts;
  };

  const topBottom: GrommetPoint[] = [];
  for (const x of along(widthIn)) {
    topBottom.push({ xIn: x, yIn: margin });
    topBottom.push({ xIn: x, yIn: heightIn - margin });
  }

  if (preset === "TOP_AND_BOTTOM") {
    return topBottom.map((p) => clampGrommetPoint(p, widthIn, heightIn, margin));
  }

  // ALL_SIDES
  const leftRight: GrommetPoint[] = [];
  for (const y of along(heightIn)) {
    if (y <= margin + 0.01 || y >= heightIn - margin - 0.01) continue; // corners already covered
    leftRight.push({ xIn: margin, yIn: y });
    leftRight.push({ xIn: widthIn - margin, yIn: y });
  }
  return [...topBottom, ...leftRight].map((p) => clampGrommetPoint(p, widthIn, heightIn, margin));
}

/**
 * Normalize a finishing change to enforce incompatibility rules.
 * Returns the corrected finishing object and a user-facing message if anything was auto-cleared.
 */
export function normalizeFinishing(next: Finishing): FinishingNormalization {
  let finishing: Finishing = { ...next };
  let message: string | undefined;

  // Ensure defaults for grommet meta when grommets on
  if (finishing.grommets) {
    finishing = {
      ...finishing,
      grommetPreset: finishing.grommetPreset ?? "TOP_AND_BOTTOM",
      grommetSpacing: finishing.grommetSpacing ?? "EVERY_2_3FT",
    };
  }

  // Pole pockets clear welding + grommets
  if (finishing.polePockets) {
    if (!finishing.polePocketDepthIn) {
      finishing = { ...finishing, polePocketDepthIn: 2 };
    }
    if (finishing.grommets || finishing.welding) {
      finishing = {
        ...finishing,
        welding: false,
        grommets: false,
        grommetPoints: undefined,
      };
      message = POLE_POCKET_INCOMPAT_MESSAGE;
    }
  } else {
    finishing = {
      ...finishing,
      polePocketPlacement: undefined,
      polePocketDepthIn: undefined,
    };
  }

  // Rope ⊥ grommets — last-write wins based on what's currently both true
  if (finishing.rope && finishing.grommets) {
    // Prefer clearing grommets when rope is on (rope toggle is the newer intent when both true after merge)
    finishing = {
      ...finishing,
      grommets: false,
      grommetPoints: undefined,
    };
    message = message ?? ROPE_GROMMET_INCOMPAT_MESSAGE;
  }

  if (finishing.rope && !finishing.ropePlacement) {
    finishing = { ...finishing, ropePlacement: "TOP" };
  }
  if (!finishing.rope) {
    finishing = { ...finishing, ropePlacement: undefined };
  }

  return { finishing, message };
}

/**
 * Apply a finishing patch with explicit intent for rope vs grommets conflicts.
 * When enabling rope, clears grommets. When enabling grommets, clears rope.
 */
export function applyFinishingPatch(
  current: Finishing,
  patch: Partial<Finishing>,
): FinishingNormalization {
  const next: Finishing = { ...current, ...patch };

  if (patch.rope === true) {
    next.grommets = false;
    next.grommetPoints = undefined;
    if (!next.ropePlacement) next.ropePlacement = "TOP";
  }
  if (patch.grommets === true) {
    next.rope = false;
    next.ropePlacement = undefined;
    next.grommetPreset = next.grommetPreset ?? "TOP_AND_BOTTOM";
    next.grommetSpacing = next.grommetSpacing ?? "EVERY_2_3FT";
  }
  if (patch.polePockets === true) {
    next.polePocketPlacement = patch.polePocketPlacement ?? current.polePocketPlacement ?? "TOP";
    next.polePocketDepthIn = patch.polePocketDepthIn ?? current.polePocketDepthIn ?? 2;
  }

  const result = normalizeFinishing(next);

  // Prefer the more specific conflict message for rope/grommet toggles
  if (patch.rope === true && current.grommets) {
    return { finishing: result.finishing, message: ROPE_GROMMET_INCOMPAT_MESSAGE };
  }
  if (patch.grommets === true && current.rope) {
    return { finishing: result.finishing, message: ROPE_GROMMET_INCOMPAT_MESSAGE };
  }

  return result;
}
