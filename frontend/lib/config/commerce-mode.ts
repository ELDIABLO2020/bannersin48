import { parseCommerceMode } from "@/scripts/lib/commerce-rules.mjs";

export const isInternalManualCommerce = parseCommerceMode(process.env.NEXT_PUBLIC_COMMERCE_MODE) === "internal_manual";
