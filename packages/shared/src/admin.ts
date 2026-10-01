import { z } from "zod";

/**
 * Admin-panel form schemas (plan §5.2): promo codes and manual reward
 * adjustments. Mirrors backend/src/admin/promos-admin.dto.ts and
 * customers-admin.dto.ts; limits must not drift.
 */

export const PROMO_CODE_PATTERN = /^[A-Za-z0-9_-]{3,40}$/;

/** Hard cap per manual reward adjustment, either direction ($500). */
export const REWARD_ADJUSTMENT_MAX_CENTS = 50_000;

/** `""`, `null` or `undefined` → `null`; anything else → number (for optional numeric inputs). */
const optionalInt = (max: number) =>
  z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? null : Number(value)),
    z.number().int("Use a whole number.").min(1, "Must be at least 1.").max(max).nullable(),
  );

/** `<input type="datetime-local">` value or empty; converted to an ISO instant on submit. */
const optionalInstant = z
  .string()
  .optional()
  .or(z.literal(""))
  .refine((value) => !value || !Number.isNaN(new Date(value).getTime()), "Enter a valid date and time.");

/** `POST /admin/promos` / `PATCH /admin/promos/:id` body, as the admin form collects it. */
export const promoCodeInputSchema = z
  .object({
    code: z.string().trim().regex(PROMO_CODE_PATTERN, "Codes are 3–40 letters, digits, dashes or underscores."),
    type: z.enum(["PERCENT", "FIXED"]),
    value: z.coerce.number().positive("Enter a discount amount.").max(100000, "Too large.").multipleOf(0.01, "Use at most two decimals."),
    minOrder: z.coerce.number().min(0, "Cannot be negative.").max(1000000, "Too large.").multipleOf(0.01, "Use at most two decimals.").default(0),
    maxUses: optionalInt(1_000_000),
    perUserLimit: optionalInt(1_000),
    startsAt: optionalInstant,
    endsAt: optionalInstant,
    active: z.boolean().default(true),
  })
  .strict()
  .superRefine((input, ctx) => {
    if (input.type === "PERCENT" && input.value > 100) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["value"], message: "A percentage discount cannot exceed 100%." });
    }
    if (input.startsAt && input.endsAt && new Date(input.endsAt).getTime() <= new Date(input.startsAt).getTime()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["endsAt"], message: "The end date must be after the start date." });
    }
  });

export type PromoCodeInput = z.infer<typeof promoCodeInputSchema>;

/** `POST /admin/customers/:id/rewards/adjust` body. Money is integer cents, never zero. */
export const rewardAdjustmentSchema = z
  .object({
    deltaCents: z
      .number()
      .int("Amount must be whole cents.")
      .min(-REWARD_ADJUSTMENT_MAX_CENTS, "Adjustments are capped at $500.")
      .max(REWARD_ADJUSTMENT_MAX_CENTS, "Adjustments are capped at $500.")
      .refine((value) => value !== 0, "Amount cannot be zero."),
    reason: z.string().trim().min(10, "Give a reason (at least 10 characters).").max(200, "Keep the reason under 200 characters."),
  })
  .strict();

export type RewardAdjustmentInput = z.infer<typeof rewardAdjustmentSchema>;
