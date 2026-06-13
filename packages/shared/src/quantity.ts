import { z } from "zod";
import { MAX_QUANTITY_PER_LINE } from "./constants";

/**
 * Per-line quantity from the plan §9.4.
 * Max 10 per configuration. More than 10 = add another line item.
 */
export const quantitySchema = z
  .number()
  .int()
  .min(1, "Quantity must be at least 1.")
  .max(MAX_QUANTITY_PER_LINE, `Max ${MAX_QUANTITY_PER_LINE} per configuration. To order more, add another line item.`);

export type Quantity = z.infer<typeof quantitySchema>;
