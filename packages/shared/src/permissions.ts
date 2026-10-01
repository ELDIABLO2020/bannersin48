/**
 * RBAC permission catalog — the single source of truth for *which* permissions
 * exist. The database (`permission`, `access_role`, `role_permission`,
 * `user_permission`) is the source of truth for *who holds them*.
 *
 * Keys are `resource:action` strings. `elevated` marks permissions that only a
 * holder of `rbac:manage` may grant to a role or a user. Design and matrix:
 * docs/accounts-admin-rbac-plan.md §3.2–3.3.
 */

export interface PermissionDefinition {
  readonly key: string;
  readonly resource: string;
  readonly action: string;
  readonly description: string;
  readonly elevated: boolean;
}

function perm(key: string, description: string, elevated = false): PermissionDefinition {
  const [resource, action] = key.split(":") as [string, string];
  return { key, resource, action, description, elevated };
}

export const PERMISSIONS = [
  perm("orders:read", "Order board, buckets, list, detail and artwork previews on an order"),
  perm("orders:update_status", "Move orders to IN_PROCESSING, ACCEPTED, SHIPPED or DELIVERED"),
  perm("orders:hold", "Place orders on hold and release them"),
  perm("orders:cancel", "Cancel orders on the customer's behalf"),
  perm("orders:dropship", "Record the drop-ship submission for an order"),
  perm("orders:tracking", "Attach a tracking number and shipping label"),
  perm("orders:note", "Add an internal activity note to an order"),
  perm("payments:mark_paid", "Record a manual payment and start the delivery clock", true),
  perm("payments:refund", "Issue refunds (reserved; not wired in V1)", true),
  perm("customers:read", "Search customers and view their profile, addresses and order history"),
  perm("customers:update", "Edit a customer's name, phone or addresses on their behalf"),
  perm("customers:reset_password", "Send an admin-initiated password reset to a customer"),
  perm("customers:suspend", "Suspend or reactivate a customer account", true),
  perm("artwork:read_any", "Download or preview any customer's artwork"),
  perm("rewards:read", "View a customer's reward ledger"),
  perm("rewards:adjust", "Adjust a customer's reward balance with a reason", true),
  perm("catalog:read", "View products, materials, finishing options and volume tiers"),
  perm("catalog:write", "Create, update or deactivate products, materials and finishing options", true),
  perm("pricing:write", "Change rates, flat prices, multipliers and volume tiers", true),
  perm("promos:read", "List promo codes"),
  perm("promos:write", "Create, update or deactivate promo codes", true),
  perm("content:read", "View CMS content blocks in the admin"),
  perm("content:edit", "Edit CMS block content"),
  perm("content:publish", "Publish, unpublish or delete CMS blocks"),
  perm("users:read", "List and view staff accounts"),
  perm("users:create", "Create or invite staff accounts", true),
  perm("users:update", "Edit a staff account and assign non-elevated roles", true),
  perm("users:suspend", "Suspend or reactivate staff accounts and revoke their sessions", true),
  perm("users:reset_password", "Send an admin-initiated password reset to a staff account", true),
  perm("rbac:read", "View roles, their permissions and any user's effective permissions"),
  perm("rbac:manage", "Manage roles and permissions, grant elevated permissions and overrides", true),
  perm("audit:read", "Read the audit log", true),
  perm("settings:read", "View site settings (reserved; not wired in V1)", true),
  perm("settings:write", "Change site settings (reserved; not wired in V1)", true),
] as const;

export type PermissionKey = (typeof PERMISSIONS)[number]["key"];

export const PERMISSION_KEYS = PERMISSIONS.map((p) => p.key) as readonly PermissionKey[];

/** The `admin` system role resolves to this wildcard and ignores overrides. */
export const ADMIN_WILDCARD = "*" as const;

/** Effective permissions as they travel over the wire (`/auth/me`, login, register). */
export type WirePermissions = readonly string[];

export function isPermissionKey(value: string): value is PermissionKey {
  return (PERMISSION_KEYS as readonly string[]).includes(value);
}

/**
 * Pure check against an effective permission list. `["*"]` (admin) satisfies
 * every key. Used by the frontend `useCan` hook and the backend `can()` helper.
 */
export function hasPermission(effective: WirePermissions | undefined | null, key: string): boolean {
  if (!effective) return false;
  return effective.includes(ADMIN_WILDCARD) || effective.includes(key);
}

export function hasAllPermissions(effective: WirePermissions | undefined | null, keys: readonly string[]): boolean {
  return keys.every((k) => hasPermission(effective, k));
}

export function hasAnyPermission(effective: WirePermissions | undefined | null, keys: readonly string[]): boolean {
  return keys.some((k) => hasPermission(effective, k));
}

/** System role keys: seeded from the legacy `Role` enum and never deletable. */
export const SYSTEM_ROLE_KEYS = ["customer", "staff", "content_editor", "admin"] as const;
export type SystemRoleKey = (typeof SYSTEM_ROLE_KEYS)[number];

/**
 * Default permission sets for the system roles (docs/accounts-admin-rbac-plan.md §3.3,
 * as amended by §11 decision 2: the default `staff` role is stripped of
 * `payments:mark_paid` and `customers:reset_password`; those are granted through
 * custom roles such as Fulfillment / Support or per-user overrides).
 *
 * `admin` is the wildcard and `customer` is always empty; both are immutable.
 */
export const SYSTEM_ROLE_DEFAULTS: Readonly<Record<SystemRoleKey, readonly PermissionKey[]>> = {
  customer: [],
  staff: [
    "orders:read",
    "orders:update_status",
    "orders:hold",
    "orders:cancel",
    "orders:dropship",
    "orders:tracking",
    "orders:note",
    "customers:read",
    "artwork:read_any",
    "rewards:read",
    "catalog:read",
    "promos:read",
  ],
  content_editor: ["content:read", "content:edit", "content:publish"],
  admin: [],
};

/** Custom role templates seeded alongside the system roles (editable, deletable). */
export const TEMPLATE_ROLE_DEFAULTS: ReadonlyArray<{
  readonly key: string;
  readonly name: string;
  readonly description: string;
  readonly legacyRole: "STAFF" | "CONTENT_EDITOR";
  readonly permissions: readonly PermissionKey[];
}> = [
  {
    key: "fulfillment",
    name: "Fulfillment",
    description: "Runs the order board: processing, drop-ship, tracking and holds. No payments.",
    legacyRole: "STAFF",
    permissions: [
      "orders:read",
      "orders:update_status",
      "orders:hold",
      "orders:dropship",
      "orders:tracking",
      "orders:note",
      "customers:read",
      "artwork:read_any",
    ],
  },
  {
    key: "support",
    name: "Support",
    description: "Helps customers: profile edits, password resets, reward adjustments, holds and cancellations.",
    legacyRole: "STAFF",
    permissions: [
      "orders:read",
      "orders:hold",
      "orders:cancel",
      "orders:note",
      "customers:read",
      "customers:update",
      "customers:reset_password",
      "artwork:read_any",
      "rewards:read",
      "rewards:adjust",
      "promos:read",
    ],
  },
  {
    key: "catalog_manager",
    name: "Catalog Manager",
    description: "Owns products, materials, finishing options, rates and promo codes.",
    legacyRole: "STAFF",
    permissions: ["catalog:read", "catalog:write", "pricing:write", "promos:read", "promos:write"],
  },
];
