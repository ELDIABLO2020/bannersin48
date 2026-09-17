/** Commerce-mode rules. Enforced at build by validate-commerce-config.mjs. */
export const COMMERCE_MODES = ["internal_manual", "public_live"];

const ENABLED_KEYS = [
  "NEXT_PUBLIC_PUBLIC_COMMERCE_ENABLED",
  "LIVE_PAYMENT_ENABLED",
  "LIVE_TAX_ENABLED",
  "PAYMENT_PROVIDER_CONFIGURED",
  "TAX_PROVIDER_CONFIGURED",
];

const HTTPS_URL_KEYS = [
  "NEXT_PUBLIC_API_BASE_URL",
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_PRIVACY_POLICY_URL",
  "NEXT_PUBLIC_TERMS_POLICY_URL",
  "NEXT_PUBLIC_SHIPPING_POLICY_URL",
  "NEXT_PUBLIC_CANCELLATION_POLICY_URL",
];

/** @param {string | undefined} value @returns {"internal_manual" | "public_live"} */
export function parseCommerceMode(value) {
  const mode = value ?? "internal_manual";
  if (COMMERCE_MODES.includes(mode)) return /** @type {"internal_manual" | "public_live"} */ (mode);
  throw new Error(`Invalid NEXT_PUBLIC_COMMERCE_MODE "${mode}". Expected ${COMMERCE_MODES.join(" or ")}.`);
}

function isAbsoluteHttpsUrl(value) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * A production `public_live` build must have every live-commerce switch on and every policy URL set.
 * @param {Record<string, string | undefined>} env
 * @returns {string[]} problems; empty when the environment is safe
 */
export function validateCommerceEnvironment(env) {
  const mode = parseCommerceMode(env.NEXT_PUBLIC_COMMERCE_MODE);
  if (mode !== "public_live" || env.NODE_ENV !== "production") return [];

  const errors = [];
  for (const key of [...HTTPS_URL_KEYS, ...ENABLED_KEYS]) {
    if (!env[key]) errors.push(`${key} is required for public_live.`);
  }
  for (const key of ENABLED_KEYS) {
    if (env[key] && env[key] !== "1" && env[key] !== "true") errors.push(`${key} must be 1 for public_live.`);
  }
  for (const key of HTTPS_URL_KEYS) {
    if (env[key] && !isAbsoluteHttpsUrl(env[key])) errors.push(`${key} must be an absolute HTTPS URL for public_live.`);
  }
  return errors;
}
