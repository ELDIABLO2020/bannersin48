import { z } from "zod";

/** Locked V1 geography. */
export const countrySchema = z.literal("US");
export type Country = z.infer<typeof countrySchema>;

export const addressSchema = z
  .object({
    fullName: z.string().min(2, "Name is required.").max(120),
    company: z.string().max(120).optional().or(z.literal("")),
    street1: z.string().min(2, "Street address is required.").max(160),
    street2: z.string().max(160).optional().or(z.literal("")),
    city: z.string().min(2, "City is required.").max(80),
    region: z.string().length(2, "Enter a two-letter US state code."),
    postalCode: z.string().regex(/^\d{5}(?:-\d{4})?$/, "Enter a valid US ZIP code."),
    country: countrySchema,
    phone: z.string().min(7).max(32).optional().or(z.literal("")),
    email: z.string().email().optional().or(z.literal("")),
  })
  .strict();

export type Address = z.infer<typeof addressSchema>;

export interface AddressValidationResult {
  /** No external provider exists in V1, so this is always false. */
  valid: false;
  verificationStatus: "unverified";
  normalized: Address;
  suggested: Address;
  validationToken: string;
  validationVersion: string;
  requiresAcknowledgement: true;
  message: string;
}
