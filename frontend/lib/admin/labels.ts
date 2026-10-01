import { MATERIALS, PERMISSIONS } from "@bannersin48/shared";

/** Staff-facing names for the enum codes the API returns. Unknown codes fall back to readable text. */

function readable(code: string): string {
  const text = code.replace(/_/g, " ").toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Shorter than the customer-facing labels: staff see payment state separately. */
const ORDER_STATUS: Record<string, string> = {
  RECEIVED: "Received",
  AWAITING_PAYMENT: "Awaiting payment",
  IN_PROCESSING: "In processing",
  ACCEPTED: "Accepted",
  ON_HOLD: "On hold",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

/** Order-board bucket names (the workflow stage, not the customer-facing status). */
const BUCKET: Record<string, string> = {
  RECEIVED: "New",
  AWAITING_PAYMENT: "Awaiting payment",
  IN_PROCESSING: "Paid, in processing",
  ACCEPTED: "Accepted, tracking added",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  ON_HOLD: "On hold",
  CANCELLED: "Cancelled",
};

const PAYMENT: Record<string, string> = {
  PENDING_PAYMENT: "Payment pending",
  MARKED_PAID: "Marked paid",
  PAID: "Paid",
  REFUNDED: "Refunded",
};

/**
 * The legacy `User.role` / `AccessRole.legacyRole` enum is a derived *kind*
 * (plan §3.1); the UI shows it only on the roles editor. Display names come
 * from the access role (`roleKeyLabel`) everywhere else.
 */
const ROLE_KIND: Record<string, string> = {
  CUSTOMER: "Customer",
  STAFF: "Staff",
  ADMIN: "Admin",
  CONTENT_EDITOR: "Content editor",
};

const PRICE_MODEL: Record<string, string> = {
  PER_SQFT: "Per sq ft",
  PER_LINEAR_FT: "Per linear ft",
  FLAT: "Flat",
};

const BLOCK_TYPE: Record<string, string> = {
  BANNER_IMAGE: "Banner image",
  TEXT: "Text",
  ANNOUNCEMENT: "Announcement",
  PROMO_STRIP: "Promo strip",
};

const STAFF_STATUS: Record<string, string> = {
  ACTIVE: "Active",
  SUSPENDED: "Suspended",
  INVITED: "Invited",
};

const REWARD_REASON: Record<string, string> = {
  ORDER_EARN: "Earned on order",
  ADJUSTMENT: "Manual adjustment",
  REDEMPTION: "Applied to order",
};

/** Human names for permission resources (the part before the colon). */
const RESOURCE: Record<string, string> = {
  orders: "Orders",
  payments: "Payments",
  customers: "Customers",
  artwork: "Artwork",
  rewards: "Rewards",
  catalog: "Catalog",
  pricing: "Pricing",
  promos: "Promo codes",
  content: "Content",
  users: "Staff accounts",
  rbac: "Roles & permissions",
  audit: "Audit log",
  settings: "Settings",
};

/** Short action names shown next to the resource in permission grids. */
const PERMISSION_ACTION: Record<string, string> = {
  "orders:read": "View orders",
  "orders:update_status": "Move orders along",
  "orders:hold": "Hold / release",
  "orders:cancel": "Cancel",
  "orders:dropship": "Record drop-ship",
  "orders:tracking": "Attach tracking",
  "orders:note": "Add notes",
  "payments:mark_paid": "Mark paid",
  "payments:refund": "Refund",
  "customers:read": "View customers",
  "customers:update": "Edit customers",
  "customers:reset_password": "Reset customer passwords",
  "customers:suspend": "Suspend customers",
  "artwork:read_any": "Open any artwork",
  "rewards:read": "View rewards",
  "rewards:adjust": "Adjust rewards",
  "catalog:read": "View catalog",
  "catalog:write": "Edit catalog",
  "pricing:write": "Change prices",
  "promos:read": "View promo codes",
  "promos:write": "Edit promo codes",
  "content:read": "View content",
  "content:edit": "Edit content",
  "content:publish": "Publish content",
  "users:read": "View staff",
  "users:create": "Add staff",
  "users:update": "Edit staff & assign roles",
  "users:suspend": "Suspend staff",
  "users:reset_password": "Reset staff passwords",
  "rbac:read": "View roles",
  "rbac:manage": "Manage roles",
  "audit:read": "Read audit log",
  "settings:read": "View settings",
  "settings:write": "Change settings",
};

/** Staff-facing name for a permission key; raw keys appear only in the roles editor next to these. */
export const permissionLabel = (key: string) => PERMISSION_ACTION[key] ?? readable(key.replace(":", " "));
export const permissionResourceLabel = (resource: string) => RESOURCE[resource] ?? readable(resource);
export const permissionDescription = (key: string) => PERMISSIONS.find((p) => p.key === key)?.description ?? "";

/** Access-role key (`fulfillment`, `content_editor`, …) → display name; custom keys fall back to readable text. */
export const roleKeyLabel = (key: string | null | undefined) => (key ? readable(key) : "No role");
export const staffStatusLabel = (code: string) => STAFF_STATUS[code] ?? readable(code);

/** `rbac.user.role.assign` → "Rbac · user · role · assign" is noise; show the verb phrase instead. */
export const auditActionLabel = (action: string) => {
  const parts = action.split(".");
  const verb = parts.at(-1) ?? action;
  const subject = parts.slice(0, -1).join(" ");
  return `${readable(verb)} ${subject.replace(/_/g, " ")}`.trim();
};

/** Customer accounts are ACTIVE or SUSPENDED (never INVITED). */
export const customerStatusLabel = (code: string) => STAFF_STATUS[code] ?? readable(code);
export const rewardReasonLabel = (code: string) => REWARD_REASON[code] ?? readable(code);

/** "10% off" / "$25.00 off" from a promo row's decimal-string value. */
export function promoDiscountLabel(promo: { type: string; value: string }): string {
  return promo.type === "PERCENT" ? `${Number(promo.value)}% off` : `$${Number(promo.value).toFixed(2)} off`;
}

/** Integer cents → "$1.20" / "−$0.80" (reward balances and adjustments). */
export function centsLabel(cents: number, signed = false): string {
  const dollars = (Math.abs(cents) / 100).toFixed(2);
  if (cents < 0) return `−$${dollars}`;
  return `${signed ? "+" : ""}$${dollars}`;
}

export const orderStatusLabel = (code: string) => ORDER_STATUS[code] ?? readable(code);
export const bucketLabel = (code: string) => BUCKET[code] ?? readable(code);
export const isBucketStatus = (code: string | null | undefined): code is string => Boolean(code && code in BUCKET);
export const paymentStatusLabel = (code: string) => PAYMENT[code] ?? readable(code);
/** Legacy kind enum (`STAFF`, `CONTENT_EDITOR`, …) → display name; shown only beside a role's key in the roles editor. */
export const roleKindLabel = (code: string) => ROLE_KIND[code] ?? readable(code);
export const priceModelLabel = (code: string) => PRICE_MODEL[code] ?? readable(code);
export const blockTypeLabel = (code: string) => BLOCK_TYPE[code] ?? readable(code);
export const materialName = (code: string) => MATERIALS.find((m) => m.id === code)?.name ?? readable(code);

/** Volume-tier rates arrive as `{ ratePerSqft }` or a per-material map; show dollars, not JSON. */
export function tierRateLabel(rates: unknown): string {
  if (rates && typeof rates === "object") {
    const entries = Object.entries(rates as Record<string, unknown>).filter(([, v]) => typeof v === "number");
    if (entries.length > 0) {
      return entries
        .map(([key, value]) => `${key === "ratePerSqft" ? "" : `${materialName(key)}: `}$${(value as number).toFixed(2)} per sq ft`)
        .join(", ");
    }
  }
  return "No rate set";
}
