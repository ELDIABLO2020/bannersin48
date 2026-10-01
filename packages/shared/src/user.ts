import { z } from "zod";

/** A row of the customer's address book, as `/users/me/addresses` serves it (not the checkout `Address` shape). */
export const savedAddressSchema = z
  .object({
    id: z.string(),
    label: z.string().nullable().optional(),
    line1: z.string(),
    line2: z.string().nullable().optional(),
    city: z.string(),
    state: z.string(),
    zip: z.string(),
    country: z.string(),
    isDefaultShipping: z.boolean(),
  })
  .strict();

export type SavedAddress = z.infer<typeof savedAddressSchema>;

/** `POST/PATCH /users/me/addresses[/:id]` body (mirrors the backend `AddressDto`). */
export const savedAddressInputSchema = z
  .object({
    label: z.string().max(60).optional().or(z.literal("")),
    line1: z.string().min(3, "Street address is required.").max(200),
    line2: z.string().max(200).optional().or(z.literal("")),
    city: z.string().min(2, "City is required.").max(80),
    state: z.string().length(2, "Use the two-letter state code."),
    zip: z.string().regex(/^\d{5}(?:-\d{4})?$/, "Enter a valid US ZIP code."),
    country: z.literal("US").default("US"),
    isDefaultShipping: z.boolean().optional(),
  })
  .strict();

export type SavedAddressInput = z.infer<typeof savedAddressInputSchema>;

export const userSchema = z
  .object({
    id: z.string(),
    email: z.string().email(),
    fullName: z.string().min(2).max(120),
    firstName: z.string().nullable().optional(),
    lastName: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    taxExempt: z.boolean().default(false),
    taxExemptApproved: z.boolean().default(false),
    rewardsPoints: z.number().int().nonnegative().default(0),
    savedAddresses: z.array(savedAddressSchema).default([]),
    /** Coarse kind, derived from the assigned access role. Present on real-API responses. */
    role: z.enum(["CUSTOMER", "STAFF", "ADMIN", "CONTENT_EDITOR"]).optional(),
    /** Access role key (`admin`, `staff`, `fulfillment`, …); null when none is assigned. */
    roleKey: z.string().nullable().optional(),
    /** Effective permissions: `["*"]` for admin, `[]` for customers. */
    permissions: z.array(z.string()).default([]),
    /**
     * True after staff created the account with a temporary password: the API
     * refuses everything except sign-out and `POST /users/me/password` until it
     * is changed (`403 PASSWORD_CHANGE_REQUIRED`).
     */
    mustChangePassword: z.boolean().default(false),
    /** Null until the address is confirmed; the account page shows a "Verify" prompt. */
    emailVerifiedAt: z.string().nullable().optional(),
    /** Set while an email change awaits confirmation at the new address. */
    pendingEmail: z.string().nullable().optional(),
    notifyOrderUpdates: z.boolean().optional(),
    notifyMarketing: z.boolean().optional(),
    createdAt: z.string(),
  })
  .strict();

export type User = z.infer<typeof userSchema>;

/** `PATCH /users/me` */
export const profileUpdateSchema = z
  .object({
    firstName: z.string().trim().min(1, "First name is required.").max(60),
    lastName: z.string().trim().min(1, "Last name is required.").max(60),
    phone: z.string().trim().max(20, "Phone is too long.").optional().or(z.literal("")),
  })
  .strict();

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

/** `PATCH /users/me/settings` */
export const accountSettingsSchema = z
  .object({
    notifyOrderUpdates: z.boolean().optional(),
    notifyMarketing: z.boolean().optional(),
  })
  .strict();

export type AccountSettingsInput = z.infer<typeof accountSettingsSchema>;

/** `POST /users/me/email` */
export const emailChangeSchema = z
  .object({
    newEmail: z.string().email("Enter a valid email."),
    currentPassword: z.string().min(1, "Enter your current password."),
  })
  .strict();

export type EmailChangeInput = z.infer<typeof emailChangeSchema>;

export const registerSchema = z
  .object({
    email: z.string().email("Enter a valid email."),
    password: z.string().min(8, "Password must be at least 8 characters."),
    fullName: z.string().min(2, "Name is required."),
  })
  .strict();

export const loginSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(1),
  })
  .strict();

export const forgotPasswordSchema = z
  .object({
    email: z.string().email("Enter a valid email."),
  })
  .strict();

export const resetPasswordSchema = z
  .object({
    token: z.string().min(10, "Reset token is required."),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters.")
      .max(128, "Password must be at most 128 characters."),
  })
  .strict();

/** Staff invite acceptance (`POST /auth/accept-invite`). */
export const acceptInviteSchema = z
  .object({
    token: z.string().min(10, "Invite token is required."),
    password: z
      .string()
      .min(12, "Password must be at least 12 characters.")
      .max(128, "Password must be at most 128 characters."),
  })
  .strict();

/** Signed-in password change (`POST /users/me/password`). */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password."),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters.")
      .max(128, "Password must be at most 128 characters."),
  })
  .strict();

export type RegisterInput = z.infer<typeof registerSchema>;
export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
