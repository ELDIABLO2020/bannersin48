import { ForbiddenException } from "@nestjs/common";
import {
  ADMIN_WILDCARD,
  PERMISSIONS,
  PERMISSION_KEYS,
  SYSTEM_ROLE_DEFAULTS,
  TEMPLATE_ROLE_DEFAULTS,
  type PermissionKey,
  type SystemRoleKey,
} from "@bannersin48/shared";

export { ADMIN_WILDCARD, PERMISSIONS, PERMISSION_KEYS, SYSTEM_ROLE_DEFAULTS, TEMPLATE_ROLE_DEFAULTS };
export type { PermissionKey, SystemRoleKey };

/** Legacy `Role` enum value, kept in sync with the assigned access role. */
export type LegacyRole = "CUSTOMER" | "STAFF" | "ADMIN" | "CONTENT_EDITOR";

export interface SystemRoleDefinition {
  key: SystemRoleKey;
  name: string;
  description: string;
  legacyRole: LegacyRole;
}

/** The four system roles, seeded by the migration and re-checked by `syncRbacCatalog`. */
export const SYSTEM_ROLES: readonly SystemRoleDefinition[] = [
  { key: "admin", name: "Admin", description: "Full access to everything, including roles and permissions.", legacyRole: "ADMIN" },
  {
    key: "staff",
    name: "Staff",
    description: "Default employee role: fulfillment and customer lookup. No payments or password resets.",
    legacyRole: "STAFF",
  },
  { key: "content_editor", name: "Content editor", description: "Edits and publishes storefront content blocks.", legacyRole: "CONTENT_EDITOR" },
  { key: "customer", name: "Customer", description: "Storefront account. No admin permissions.", legacyRole: "CUSTOMER" },
];

export const ADMIN_ROLE_KEY: SystemRoleKey = "admin";
export const CUSTOMER_ROLE_KEY: SystemRoleKey = "customer";

/**
 * System role key for a legacy enum value. Since phase 5 every row has an access
 * role; this only backs the bare-row fallback in `resolveEffective` (CLI, older
 * specs) and the enum→role mapping in catalog sync.
 */
export function systemRoleKeyFor(legacyRole: string): SystemRoleKey {
  switch (legacyRole) {
    case "ADMIN":
      return "admin";
    case "STAFF":
      return "staff";
    case "CONTENT_EDITOR":
      return "content_editor";
    default:
      return "customer";
  }
}

/** Resolved permissions: the admin wildcard, or the exact set a user holds. */
export type EffectivePermissions = ReadonlySet<PermissionKey> | typeof ADMIN_WILDCARD;

/**
 * The slice of a user row the resolver needs. Relations are optional so callers
 * that only loaded the bare row (older specs, the CLI) still get a sensible
 * answer: without an access role the legacy enum's default set applies.
 */
export interface RbacUserShape {
  role: string;
  accessRole?: {
    key: string;
    permissions?: ReadonlyArray<{ permissionKey: string }>;
  } | null;
  permissionOverrides?: ReadonlyArray<{
    permissionKey: string;
    effect: "ALLOW" | "DENY";
    expiresAt: Date | null;
  }>;
}

/**
 * Pure resolver: `role.permissions ∪ ALLOW overrides − DENY overrides`.
 * The `admin` role is the wildcard and ignores overrides. Expired overrides are
 * ignored. Unknown keys (removed from the catalog) are dropped.
 */
export function resolveEffective(user: RbacUserShape, now: Date = new Date()): EffectivePermissions {
  const roleKey = user.accessRole?.key ?? systemRoleKeyFor(user.role);
  if (roleKey === ADMIN_ROLE_KEY) return ADMIN_WILDCARD;

  const base: Iterable<string> = user.accessRole
    ? (user.accessRole.permissions ?? []).map((p) => p.permissionKey)
    : SYSTEM_ROLE_DEFAULTS[systemRoleKeyFor(user.role)];

  const effective = new Set<PermissionKey>();
  for (const key of base) if (isKnown(key)) effective.add(key);

  const live = (user.permissionOverrides ?? []).filter((o) => o.expiresAt === null || o.expiresAt > now);
  for (const o of live) if (o.effect === "ALLOW" && isKnown(o.permissionKey)) effective.add(o.permissionKey);
  for (const o of live) if (o.effect === "DENY") effective.delete(o.permissionKey as PermissionKey);
  return effective;
}

function isKnown(key: string): key is PermissionKey {
  return (PERMISSION_KEYS as readonly string[]).includes(key);
}

/** Role key for the wire shape (`null` when no access role is assigned yet). */
export function roleKeyOf(user: Pick<RbacUserShape, "accessRole">): string | null {
  return user.accessRole?.key ?? null;
}

/** Wire form: `["*"]` for admin, otherwise the sorted key list. */
export function toWirePermissions(effective: EffectivePermissions): string[] {
  return effective === ADMIN_WILDCARD ? [ADMIN_WILDCARD] : [...effective].sort();
}

export function can(user: { permissions: EffectivePermissions }, key: PermissionKey): boolean {
  return user.permissions === ADMIN_WILDCARD || user.permissions.has(key);
}

export function canAll(user: { permissions: EffectivePermissions }, keys: readonly PermissionKey[]): boolean {
  return keys.every((k) => can(user, k));
}

export function canAny(user: { permissions: EffectivePermissions }, keys: readonly PermissionKey[]): boolean {
  return keys.some((k) => can(user, k));
}

/** Throws the same 403 the guard does; for checks that depend on the request body. */
export function assertCan(user: { permissions: EffectivePermissions }, keys: readonly PermissionKey[]): void {
  const missing = keys.filter((k) => !can(user, k));
  if (missing.length > 0) {
    throw new ForbiddenException({
      code: "FORBIDDEN_PERMISSION",
      message: "You do not have permission to do this.",
      required: missing,
    });
  }
}

const ELEVATED = new Set<string>(PERMISSIONS.filter((p) => p.elevated).map((p) => p.key));

export function isElevated(key: string): boolean {
  return ELEVATED.has(key);
}
