import { z } from "zod";

/**
 * Cutoff/delivery engine responses.
 */
export const deliveryResponseSchema = z
  .object({
    timezone: z.literal("America/New_York"),
    currentEt: z.string(), // ISO timestamp
    cutoffAtEt: z.string(), // ISO timestamp — next 9:00 PM ET
    cutoffInMs: z.number().int().nonnegative(),
    guaranteedDeliveryDate: z.string(), // YYYY-MM-DD
    guaranteedDeliveryDow: z.string(), // "Monday" | ...
    guaranteedDeliveryLocal: z.string(), // "12:00 PM"
    cycleIndex: z.number().int().min(0).max(5),
  })
  .strict();

export type DeliveryResponse = z.infer<typeof deliveryResponseSchema>;
