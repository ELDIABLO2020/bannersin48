import { z } from "zod";
import { POLE_POCKET_INCOMPAT_MESSAGE } from "./constants";

/**
 * Finishing options from the plan §8.
 * Pole pockets: when selected, grommets and welding MUST be removed.
 * Welding: included on 13/15/18 oz unless pole pockets selected.
 * Grommets: included on 13/15/18 oz unless pole pockets selected.
 * Wind slits: optional add-on.
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

export const finishingSchema = z
  .object({
    welding: z.boolean(),
    grommets: z.boolean(),
    windSlits: z.boolean(),
    polePockets: z.boolean(),
    polePocketPlacement: polePocketPlacementSchema.optional(),
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
    if (!val.polePockets && val.polePocketPlacement) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["polePocketPlacement"],
        message: "Pole pocket placement requires pole pockets to be enabled.",
      });
    }
    // Incompatibility rule from §8.2
    if (val.polePockets && (val.grommets || val.welding)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: POLE_POCKET_INCOMPAT_MESSAGE,
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

export interface FinishingNormalization {
  finishing: Finishing;
  message?: string;
}

/**
 * Normalize a finishing change to enforce the §8.2 incompatibility rule.
 * Returns the corrected finishing object and a user-facing message if anything was auto-cleared.
 */
export function normalizeFinishing(next: Finishing): FinishingNormalization {
  if (next.polePockets) {
    if (next.grommets || next.welding) {
      return {
        finishing: {
          welding: false,
          grommets: false,
          windSlits: next.windSlits,
          polePockets: true,
          polePocketPlacement: next.polePocketPlacement,
        },
        message: POLE_POCKET_INCOMPAT_MESSAGE,
      };
    }
  }
  return { finishing: next };
}
