/**
 * In-memory fixtures for the MSW mock backend.
 * Designed so the frontend can develop, screenshot, and E2E-test every screen
 * before the real NestJS backend ships.
 */

import {
  PRODUCTS,
  SYSTEM_ROLE_DEFAULTS,
  TEMPLATE_ROLE_DEFAULTS,
  priceOrder,
  type Order,
  type SavedAddress,
  type User,
} from "@bannersin48/shared";
import type { RewardLedgerEntry, SavedDesign, SessionSummary } from "../account";
import type { AdminPromoCode } from "../admin";
import type { AdminRole, AuditEntry, StaffUserDetail, UserPermissionOverride } from "../rbac";

/** Account state the admin panel acts on for CUSTOMER-kind users (plan §5.2). */
export interface MockCustomerAccount {
  status: "ACTIVE" | "SUSPENDED";
  suspendedAt: string | null;
  suspendedReason: string | null;
  lastLoginAt: string | null;
}

interface MockOrderRecord {
  order: Order;
}

/** Mock-only: `localStorage["bi48.mock.permissions"]` = `{ [userId]: string[] }` overrides a login user's effective permissions at boot. */
export const MOCK_PERMISSIONS_KEY = "bi48.mock.permissions";

function readPermissionOverrides(): Record<string, string[]> {
  try {
    const raw = globalThis.localStorage?.getItem(MOCK_PERMISSIONS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string[]>) : {};
  } catch {
    return {};
  }
}

class MockStore {
  users: Map<string, { user: User; password: string }> = new Map();
  userIdCounter = 1;
  /** Staff directory as `/admin/users` serves it (keyed by user id). Login users with staff access mirror into here. */
  staff: Map<string, StaffUserDetail> = new Map();
  roles: AdminRole[] = [];
  overrides: Map<string, UserPermissionOverride[]> = new Map();
  audit: AuditEntry[] = [];
  auditIdCounter = 1;
  /** Raw invite token → user id (mock only; the real API stores a hash). */
  invites: Map<string, string> = new Map();
  artwork: Map<
    string,
    {
      id: string;
      userId: string;
      folderId: string;
      filename: string;
      previewUrl: string;
      mime: string;
      size: number;
      widthPx?: number;
      heightPx?: number;
      dpi?: number;
    }
  > = new Map();
  artworkIdCounter = 1;
  artworkFolders: Array<{ id: string; name: string; parentId: string | null }> = [
    { id: "folder_home", name: "Home", parentId: null },
  ];
  quotes: Map<string, { request: Record<string, unknown>; validUntil: string; total: number }> = new Map();
  quoteIdCounter = 1;
  orders: Map<string, MockOrderRecord> = new Map();
  orderIdCounter = 1;
  // --- Customer account (plan §4.2) ---
  addresses: Map<string, SavedAddress & { userId: string }> = new Map();
  addressIdCounter = 1;
  sessions: Array<Omit<SessionSummary, "current"> & { userId: string; revoked: boolean }> = [];
  sessionIdCounter = 1;
  ledger: Array<RewardLedgerEntry & { userId: string }> = [];
  designs: Map<string, SavedDesign & { userId: string }> = new Map();
  designIdCounter = 1;
  /** Raw action token → { userId, purpose, payload } (mock only; the real API stores a hash). */
  actionTokens: Map<string, { userId: string; purpose: "EMAIL_CHANGE" | "EMAIL_VERIFY"; payload: Record<string, string> }> = new Map();
  // --- Admin panel (plan §5.2) ---
  /** Per-customer account state; customers missing here are ACTIVE. */
  customerAccounts: Map<string, MockCustomerAccount> = new Map();
  promos: AdminPromoCode[] = [];
  promoIdCounter = 1;
  /** Whether a mock user's password check passes for `/users/me/email` (fixtures store plain passwords). */
  passwordOf(userId: string): string | null {
    for (const record of this.users.values()) if (record.user.id === userId) return record.password;
    return null;
  }
}

export const store = new MockStore();

// Seed a demo customer (no admin permissions), a demo admin (the `*` wildcard) and a
// fulfillment employee. Mirrors backend/src/common/user.serializer.ts: `roleKey` +
// `permissions` + `mustChangePassword` travel with the user.
const SEEDED_AT = "2026-08-29T00:00:00.000Z";
const FULFILLMENT_PERMISSIONS = [...TEMPLATE_ROLE_DEFAULTS.find((t) => t.key === "fulfillment")!.permissions];

store.users.set("demo@bannersin48.com", {
  user: {
    id: "user_demo",
    email: "demo@bannersin48.com",
    fullName: "Demo Customer",
    firstName: "Demo",
    lastName: "Customer",
    phone: "734-555-0100",
    taxExempt: false,
    taxExemptApproved: false,
    rewardsPoints: 120,
    savedAddresses: [],
    role: "CUSTOMER",
    roleKey: "customer",
    permissions: [],
    mustChangePassword: false,
    emailVerifiedAt: SEEDED_AT,
    pendingEmail: null,
    notifyOrderUpdates: true,
    notifyMarketing: false,
    createdAt: SEEDED_AT,
  },
  password: "demo1234",
});
store.users.set("admin@bannersin48.local", {
  user: {
    id: "user_admin",
    email: "admin@bannersin48.local",
    fullName: "Site Admin",
    taxExempt: false,
    taxExemptApproved: false,
    rewardsPoints: 0,
    savedAddresses: [],
    role: "ADMIN",
    roleKey: "admin",
    permissions: ["*"],
    mustChangePassword: false,
    createdAt: new Date().toISOString(),
  },
  password: "admin1234", // mock-only credential
});
store.users.set("staff@bannersin48.local", {
  user: {
    id: "user_staff",
    email: "staff@bannersin48.local",
    fullName: "Pat Picker",
    taxExempt: false,
    taxExemptApproved: false,
    rewardsPoints: 0,
    savedAddresses: [],
    role: "STAFF",
    roleKey: "fulfillment",
    permissions: FULFILLMENT_PERMISSIONS,
    mustChangePassword: false,
    createdAt: SEEDED_AT,
  },
  password: "staff1234", // mock-only credential
});

// A second customer with an open order, so the admin board, customer directory and
// order note flow have data without running a checkout first. Suspended in the
// fixture so the "reactivate" path is reachable too.
store.users.set("jordan.rivera@example.com", {
  user: {
    id: "user_customer_2",
    email: "jordan.rivera@example.com",
    fullName: "Jordan Rivera",
    firstName: "Jordan",
    lastName: "Rivera",
    phone: null,
    taxExempt: false,
    taxExemptApproved: false,
    rewardsPoints: 0,
    savedAddresses: [],
    role: "CUSTOMER",
    roleKey: "customer",
    permissions: [],
    mustChangePassword: false,
    emailVerifiedAt: null,
    pendingEmail: null,
    notifyOrderUpdates: true,
    notifyMarketing: true,
    createdAt: "2026-09-12T16:00:00.000Z",
  },
  password: "jordan1234", // mock-only credential
});
store.customerAccounts.set("user_customer_2", { status: "SUSPENDED", suspendedAt: "2026-09-25T09:30:00.000Z", suspendedReason: "Repeated chargebacks", lastLoginAt: "2026-09-24T18:05:00.000Z" });
store.customerAccounts.set("user_demo", { status: "ACTIVE", suspendedAt: null, suspendedReason: null, lastLoginAt: "2026-09-30T09:12:00.000Z" });

// A narrower permission list seeded by e2e (see frontend/e2e/helpers/auth.ts) wins over the fixture.
for (const [userId, permissions] of Object.entries(readPermissionOverrides())) {
  for (const record of store.users.values()) {
    if (record.user.id === userId) record.user.permissions = permissions;
  }
}

// --- RBAC admin fixtures (plan §5.2): roles, staff directory, overrides, audit --------------
const systemRole = (id: string, key: string, name: string, description: string, legacyRole: AdminRole["legacyRole"], permissions: readonly string[]): AdminRole => ({
  id,
  key,
  name,
  description,
  legacyRole,
  isSystem: true,
  immutable: key === "admin" || key === "customer",
  permissions: [...permissions].sort(),
  memberCount: 0,
  createdAt: SEEDED_AT,
  updatedAt: SEEDED_AT,
});
store.roles = [
  systemRole("role_admin", "admin", "Admin", "Full access to everything, including roles and permissions.", "ADMIN", []),
  systemRole("role_staff", "staff", "Staff", "Default employee role: fulfillment and customer lookup. No payments or password resets.", "STAFF", SYSTEM_ROLE_DEFAULTS.staff),
  systemRole("role_content_editor", "content_editor", "Content editor", "Edits and publishes storefront content blocks.", "CONTENT_EDITOR", SYSTEM_ROLE_DEFAULTS.content_editor),
  systemRole("role_customer", "customer", "Customer", "Storefront account. No admin permissions.", "CUSTOMER", []),
  ...TEMPLATE_ROLE_DEFAULTS.map<AdminRole>((tpl) => ({
    id: `role_${tpl.key}`,
    key: tpl.key,
    name: tpl.name,
    description: tpl.description,
    legacyRole: tpl.legacyRole,
    isSystem: false,
    immutable: false,
    permissions: [...tpl.permissions].sort(),
    memberCount: 0,
    createdAt: SEEDED_AT,
    updatedAt: SEEDED_AT,
  })),
];

const staffRow = (input: Partial<StaffUserDetail> & Pick<StaffUserDetail, "id" | "email" | "firstName" | "lastName" | "roleId" | "status">): StaffUserDetail => {
  const role = store.roles.find((r) => r.id === input.roleId);
  return {
    phone: null,
    fullName: [input.firstName, input.lastName].filter(Boolean).join(" ") || null,
    role: (role?.legacyRole as StaffUserDetail["role"]) ?? "STAFF",
    roleKey: role?.key ?? null,
    roleName: role?.name ?? null,
    mustChangePassword: false,
    overrideCount: 0,
    lastLoginAt: null,
    invitedBy: null,
    suspendedAt: null,
    suspendedReason: null,
    emailVerifiedAt: SEEDED_AT,
    passwordChangedAt: null,
    permissions: role?.key === "admin" ? ["*"] : [...(role?.permissions ?? [])],
    invite: null,
    createdAt: SEEDED_AT,
    ...input,
  };
};
for (const row of [
  staffRow({ id: "user_admin", email: "admin@bannersin48.local", firstName: "Site", lastName: "Admin", roleId: "role_admin", status: "ACTIVE", lastLoginAt: "2026-09-29T15:12:00.000Z" }),
  staffRow({ id: "user_staff", email: "staff@bannersin48.local", firstName: "Pat", lastName: "Picker", roleId: "role_fulfillment", status: "ACTIVE", lastLoginAt: "2026-09-30T08:02:00.000Z", invitedBy: "user_admin" }),
  staffRow({ id: "user_support", email: "sam@bannersin48.local", firstName: "Sam", lastName: "Support", roleId: "role_support", status: "SUSPENDED", suspendedAt: "2026-09-20T10:00:00.000Z", suspendedReason: "Seasonal contract ended", invitedBy: "user_admin" }),
  staffRow({
    id: "user_invited",
    email: "new.editor@bannersin48.local",
    firstName: "Noor",
    lastName: "Editor",
    roleId: "role_content_editor",
    status: "INVITED",
    emailVerifiedAt: null,
    invitedBy: "user_admin",
    invite: { createdAt: "2026-09-29T09:00:00.000Z", expiresAt: "2026-10-02T09:00:00.000Z" },
  }),
]) {
  store.staff.set(row.id, row);
}
store.invites.set("mock-invite-token-user_invited", "user_invited");
for (const role of store.roles) role.memberCount = Array.from(store.staff.values()).filter((s) => s.roleId === role.id).length;

store.audit = [
  {
    id: "al_3",
    actorId: "user_admin",
    actorEmail: "admin@bannersin48.local",
    action: "user.suspend",
    entityType: "user",
    entityId: "user_support",
    diff: { status: { from: "ACTIVE", to: "SUSPENDED" }, reason: "Seasonal contract ended" },
    ip: "203.0.113.10",
    createdAt: "2026-09-20T10:00:00.000Z",
  },
  {
    id: "al_2",
    actorId: "user_admin",
    actorEmail: "admin@bannersin48.local",
    action: "rbac.role.permissions.set",
    entityType: "access_role",
    entityId: "role_fulfillment",
    diff: { roleKey: "fulfillment", permissions: { from: [...FULFILLMENT_PERMISSIONS, "orders:cancel"].sort(), to: [...FULFILLMENT_PERMISSIONS].sort() } },
    ip: "203.0.113.10",
    createdAt: "2026-09-18T14:30:00.000Z",
  },
  {
    id: "al_1",
    actorId: null,
    actorEmail: null,
    action: "user.cli_password_reset",
    entityType: "user",
    entityId: "user_admin",
    diff: { actor: "system:cli", passwordChanged: true, sessionsRevoked: true },
    ip: null,
    createdAt: "2026-09-01T09:00:00.000Z",
  },
];
store.auditIdCounter = 4;

// Seed Image Zone sample assets in Home folder
store.artwork.set("art_sample_1", {
  id: "art_sample_1",
  userId: "user_demo",
  folderId: "folder_home",
  filename: "grand-opening.png",
  previewUrl: "/mock-artwork-portrait.svg",
  mime: "image/png",
  size: 240_000,
  widthPx: 1800,
  heightPx: 3600,
  dpi: 150,
});
store.artwork.set("art_sample_2", {
  id: "art_sample_2",
  userId: "user_demo",
  folderId: "folder_home",
  filename: "sale-banner.jpg",
  previewUrl: "/mock-artwork-landscape.svg",
  mime: "image/jpeg",
  size: 180_000,
  widthPx: 2400,
  heightPx: 1200,
  dpi: 150,
});
store.artwork.set("art_sample_3", {
  id: "art_sample_3",
  userId: "user_customer_2",
  folderId: "folder_home",
  filename: "clinic-opening.png",
  previewUrl: "/mock-artwork-landscape.svg",
  mime: "image/png",
  size: 310_000,
  widthPx: 3600,
  heightPx: 1200,
  dpi: 150,
});
store.artworkIdCounter = 4;

// --- One open order for the admin board (plan §5.2) --------------------------------------
{
  const input = {
    productId: "HD_BANNER" as const,
    material: "VINYL_13OZ_SINGLE" as const,
    dimensions: { widthFt: 6, widthIn: 0, heightFt: 2, heightIn: 0 },
    finishing: { ...PRODUCTS.HD_BANNER.defaultFinishing },
    quantity: 2,
  };
  const priced = priceOrder([input]);
  const line = priced.lines[0]!;
  const placedAt = "2026-09-30T14:20:00.000Z";
  const order: Order = {
    id: "ord_seed_2",
    userId: "user_customer_2",
    orderNumber: "BI48-000018",
    lines: [{ id: "line_seed_2", ...input, artworkId: "art_sample_3", unitProduct: line.unitProduct, addons: line.addons, productSubtotal: line.productSubtotal, shipping: line.shipping, totalBeforeTax: line.totalBeforeTax, billableSqFt: line.billableSqFt, billableDims: line.billableDims }],
    status: "RECEIVED",
    paymentStatus: "PENDING_PAYMENT",
    currency: "USD",
    subtotal: priced.subtotal,
    shipping: priced.shipping,
    tax: 0,
    rewardsDiscount: 0,
    total: priced.total,
    artworkIds: ["art_sample_3"],
    guaranteedDeliveryDate: "2026-10-02",
    guaranteedDeliveryDow: "Friday",
    proofConfirmedAt: placedAt,
    placedAt,
    createdAt: placedAt,
    updatedAt: placedAt,
    events: [{ id: "evt_seed_2", fromStatus: null, toStatus: "RECEIVED", actor: "customer", note: "Order placed.", createdAt: placedAt }],
  };
  store.orders.set(order.id, { order });
}

// --- Promo codes (management only; checkout does not apply them yet, plan §11 Q7) ---------
store.promos = [
  { id: "promo_1", code: "WELCOME10", type: "PERCENT", value: "10.00", minOrder: "0.00", maxUses: null, perUserLimit: 1, timesUsed: 14, startsAt: null, endsAt: null, active: true, createdAt: "2026-08-15T10:00:00.000Z", updatedAt: "2026-08-15T10:00:00.000Z" },
  { id: "promo_2", code: "FALL25", type: "FIXED", value: "25.00", minOrder: "150.00", maxUses: 200, perUserLimit: null, timesUsed: 37, startsAt: "2026-09-15T04:00:00.000Z", endsAt: "2026-11-01T04:00:00.000Z", active: true, createdAt: "2026-09-10T10:00:00.000Z", updatedAt: "2026-09-10T10:00:00.000Z" },
  { id: "promo_3", code: "SUMMER5", type: "FIXED", value: "5.00", minOrder: "0.00", maxUses: null, perUserLimit: null, timesUsed: 212, startsAt: "2026-06-01T04:00:00.000Z", endsAt: "2026-09-01T04:00:00.000Z", active: false, createdAt: "2026-05-20T10:00:00.000Z", updatedAt: "2026-09-01T04:00:00.000Z" },
];
store.promoIdCounter = 4;

// --- Customer account fixtures for the demo customer (plan §4.2) --------------------------
for (const address of [
  { id: "addr_demo_1", userId: "user_demo", label: "Shop", line1: "120 W Michigan Ave", line2: "Suite 4", city: "Ypsilanti", state: "MI", zip: "48197", country: "US", isDefaultShipping: true },
  { id: "addr_demo_2", userId: "user_demo", label: "Home", line1: "8 Elm St", line2: null, city: "Ann Arbor", state: "MI", zip: "48104", country: "US", isDefaultShipping: false },
]) {
  store.addresses.set(address.id, address);
}
store.addressIdCounter = 3;

store.sessions = [
  { id: "sess_demo_current", userId: "user_demo", createdAt: "2026-09-29T08:00:00.000Z", lastUsedAt: "2026-09-30T09:12:00.000Z", expiresAt: "2026-10-29T08:00:00.000Z", userAgent: "Mozilla/5.0 (Macintosh) Chrome/129", ip: "203.0.113.0/24", revoked: false },
  { id: "sess_demo_phone", userId: "user_demo", createdAt: "2026-09-20T18:30:00.000Z", lastUsedAt: "2026-09-28T07:45:00.000Z", expiresAt: "2026-10-20T18:30:00.000Z", userAgent: "Mozilla/5.0 (iPhone) Safari/18", ip: "198.51.100.0/24", revoked: false },
  { id: "sess_demo_tablet", userId: "user_demo", createdAt: "2026-09-02T12:00:00.000Z", lastUsedAt: null, expiresAt: "2026-10-02T12:00:00.000Z", userAgent: null, ip: null, revoked: false },
];
store.sessionIdCounter = 4;

/** Sums to the demo user's `rewardsPoints` (120 cents) — `account-fixtures.test.ts` asserts it. */
store.ledger = [
  { id: "rl_demo_3", userId: "user_demo", deltaCents: -80, reason: "REDEMPTION", orderId: null, orderNumber: null, createdAt: "2026-09-18T15:00:00.000Z" },
  { id: "rl_demo_2", userId: "user_demo", deltaCents: 50, reason: "ADJUSTMENT", orderId: null, orderNumber: null, createdAt: "2026-09-10T11:20:00.000Z" },
  { id: "rl_demo_1", userId: "user_demo", deltaCents: 150, reason: "ORDER_EARN", orderId: "ord_seed_1", orderNumber: "BI48-000017", createdAt: "2026-09-02T09:00:00.000Z" },
];

for (const design of [
  {
    id: "design_demo_1",
    userId: "user_demo",
    name: "Grand opening banner",
    productId: "HD_BANNER",
    productSlug: "hd-banner",
    productName: "HD Banner",
    config: {
      material: "VINYL_13OZ_SINGLE",
      dimensions: { widthFt: 8, widthIn: 0, heightFt: 4, heightIn: 0 },
      finishing: { welding: true, grommets: true, windSlits: false, polePockets: false, rope: false, webbing: false },
      quantity: 1,
    },
    artworkFileId: "art_sample_1",
    previewUrl: "/mock-artwork-portrait.svg",
    createdAt: "2026-09-05T10:00:00.000Z",
    updatedAt: "2026-09-05T10:00:00.000Z",
  },
  {
    id: "design_demo_2",
    userId: "user_demo",
    name: "Autumn sale mesh",
    productId: "MESH",
    productSlug: "mesh",
    productName: "Mesh Banner",
    config: {
      material: "MESH_8OZ",
      dimensions: { widthFt: 10, widthIn: 0, heightFt: 3, heightIn: 0 },
      finishing: { welding: true, grommets: true, windSlits: false, polePockets: false, rope: false, webbing: false },
      quantity: 2,
    },
    artworkFileId: null,
    previewUrl: null,
    createdAt: "2026-08-20T14:00:00.000Z",
    updatedAt: "2026-09-12T16:30:00.000Z",
  },
]) {
  store.designs.set(design.id, design);
}
store.designIdCounter = 3;
