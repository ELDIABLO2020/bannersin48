import { z } from "zod";
import { addressSchema } from "./address";

export const userSchema = z
  .object({
    id: z.string(),
    email: z.string().email(),
    fullName: z.string().min(2).max(120),
    taxExempt: z.boolean().default(false),
    taxExemptApproved: z.boolean().default(false),
    rewardsPoints: z.number().int().nonnegative().default(0),
    savedAddresses: z.array(addressSchema).default([]),
    createdAt: z.string(),
  })
  .strict();

export type User = z.infer<typeof userSchema>;

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

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
