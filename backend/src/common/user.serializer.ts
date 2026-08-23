import type { User } from "@prisma/client";

export interface SerializedAddress {
  id: string;
  label?: string | null;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export interface SerializedUser {
  id: string;
  email: string;
  fullName: string;
  taxExempt: boolean;
  taxExemptApproved: boolean;
  rewardsPoints: number;
  savedAddresses: SerializedAddress[];
  createdAt: string;
}

function splitName(user: Pick<User, "firstName" | "lastName" | "email">): string {
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return name.length > 0 ? name : user.email;
}

/**
 * Serialize a user row into the shape the frontend expects
 * (matches the shared `userSchema` / MSW fixtures — do not change field names).
 */
export function serializeUser(
  user: User,
  addresses: SerializedAddress[] = [],
): SerializedUser {
  return {
    id: user.id,
    email: user.email,
    fullName: splitName(user),
    taxExempt: false,
    taxExemptApproved: false,
    rewardsPoints: user.rewardPointsBalance,
    savedAddresses: addresses,
    createdAt: user.createdAt.toISOString(),
  };
}
