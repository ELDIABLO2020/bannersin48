import type { Address, User } from "@prisma/client";
import { resolveEffective, roleKeyOf, toWirePermissions, type RbacUserShape } from "../rbac/permissions";

export interface SerializedAddress {
  id: string;
  label?: string | null;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  zip: string;
  country: string;
  isDefaultShipping: boolean;
}

export interface SerializedUser {
  id: string;
  email: string;
  fullName: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  taxExempt: boolean;
  taxExemptApproved: boolean;
  rewardsPoints: number;
  savedAddresses: SerializedAddress[];
  /** Legacy coarse kind, derived from the access role. */
  role?: string;
  /** Access role key (`admin`, `staff`, `fulfillment`, …); null until a role is assigned. */
  roleKey: string | null;
  /** Effective permissions: `["*"]` for admin, `[]` for customers. */
  permissions: string[];
  /** Set when staff created the account with a temporary password; cleared by `POST /users/me/password`. */
  mustChangePassword: boolean;
  /** Null until the address is confirmed (`POST /auth/verify-email` or an accepted invite). */
  emailVerifiedAt: string | null;
  /** Set while an email change awaits confirmation (`POST /users/me/email`). */
  pendingEmail: string | null;
  notifyOrderUpdates: boolean;
  notifyMarketing: boolean;
  createdAt: string;
}

export function serializeAddress(a: Address): SerializedAddress {
  return {
    id: a.id,
    label: a.label,
    line1: a.line1,
    line2: a.line2,
    city: a.city,
    state: a.state,
    zip: a.zip,
    country: a.country,
    isDefaultShipping: a.isDefaultShipping,
  };
}

function splitName(user: Pick<User, "firstName" | "lastName" | "email">): string {
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return name.length > 0 ? name : user.email;
}

/**
 * Serialize a user row into the shape the frontend expects
 * (matches the shared `userSchema` / MSW fixtures — do not change field names).
 *
 * Load the row with `rbacUserInclude()` so `permissions` reflects the assigned
 * role and overrides; a bare row falls back to the legacy enum's default set.
 */
export function serializeUser(
  user: User & Partial<Pick<RbacUserShape, "accessRole" | "permissionOverrides">>,
  addresses: SerializedAddress[] = [],
): SerializedUser {
  return {
    id: user.id,
    email: user.email,
    fullName: splitName(user),
    firstName: user.firstName ?? null,
    lastName: user.lastName ?? null,
    phone: user.phone ?? null,
    taxExempt: false,
    taxExemptApproved: false,
    rewardsPoints: user.rewardPointsBalance,
    savedAddresses: addresses,
    role: user.role,
    roleKey: roleKeyOf(user),
    permissions: toWirePermissions(resolveEffective(user)),
    mustChangePassword: Boolean(user.mustChangePassword),
    emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
    pendingEmail: user.pendingEmail ?? null,
    notifyOrderUpdates: user.notifyOrderUpdates ?? true,
    notifyMarketing: user.notifyMarketing ?? false,
    createdAt: user.createdAt.toISOString(),
  };
}
