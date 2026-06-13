import { z } from "zod";

/**
 * US + Canada address. Validation provider runs server-side.
 * FedEx only, US & Canada.
 */
export const countrySchema = z.enum(["US", "CA"]);
export type Country = z.infer<typeof countrySchema>;

export const addressSchema = z
  .object({
    fullName: z.string().min(2, "Name is required.").max(120),
    company: z.string().max(120).optional().or(z.literal("")),
    street1: z.string().min(2, "Street address is required.").max(160),
    street2: z.string().max(160).optional().or(z.literal("")),
    city: z.string().min(2, "City is required.").max(80),
    region: z.string().min(2, "State / province is required.").max(80),
    postalCode: z.string().min(3, "Postal code is required.").max(12),
    country: countrySchema,
    phone: z.string().min(7).max(32).optional().or(z.literal("")),
    email: z.string().email().optional().or(z.literal("")),
  })
  .strict();

export type Address = z.infer<typeof addressSchema>;

export interface AddressValidationResult {
  valid: boolean;
  suggested?: Address;
  requiresAcknowledgement: boolean;
  message?: string;
}
