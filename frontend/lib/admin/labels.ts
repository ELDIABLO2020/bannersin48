import { MATERIALS } from "@bannersin48/shared";

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

const PAYMENT: Record<string, string> = {
  PENDING_PAYMENT: "Payment pending",
  MARKED_PAID: "Marked paid",
  PAID: "Paid",
  REFUNDED: "Refunded",
};

const ROLE: Record<string, string> = {
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

export const orderStatusLabel = (code: string) => ORDER_STATUS[code] ?? readable(code);
export const paymentStatusLabel = (code: string) => PAYMENT[code] ?? readable(code);
export const roleLabel = (code: string) => ROLE[code] ?? readable(code);
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
