export const COMMERCE_MODES = ["internal_manual", "public_live"] as const;

export type CommerceMode = (typeof COMMERCE_MODES)[number];

export type CommerceEnvironment = Partial<Record<
  | "NODE_ENV"
  | "VERCEL_ENV"
  | "DEPLOYMENT_ENV"
  | "NEXT_PUBLIC_COMMERCE_MODE"
  | "NEXT_PUBLIC_API_BASE_URL"
  | "NEXT_PUBLIC_SITE_URL"
  | "NEXT_PUBLIC_PUBLIC_COMMERCE_ENABLED"
  | "LIVE_PAYMENT_ENABLED"
  | "LIVE_TAX_ENABLED"
  | "PAYMENT_PROVIDER_CONFIGURED"
  | "TAX_PROVIDER_CONFIGURED"
  | "NEXT_PUBLIC_PRIVACY_POLICY_URL"
  | "NEXT_PUBLIC_TERMS_POLICY_URL"
  | "NEXT_PUBLIC_SHIPPING_POLICY_URL"
  | "NEXT_PUBLIC_CANCELLATION_POLICY_URL",
  string | undefined
>>;

const PUBLIC_LIVE_REQUIREMENTS: ReadonlyArray<keyof CommerceEnvironment> = [
  "NEXT_PUBLIC_API_BASE_URL",
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_PUBLIC_COMMERCE_ENABLED",
  "LIVE_PAYMENT_ENABLED",
  "LIVE_TAX_ENABLED",
  "PAYMENT_PROVIDER_CONFIGURED",
  "TAX_PROVIDER_CONFIGURED",
  "NEXT_PUBLIC_PRIVACY_POLICY_URL",
  "NEXT_PUBLIC_TERMS_POLICY_URL",
  "NEXT_PUBLIC_SHIPPING_POLICY_URL",
  "NEXT_PUBLIC_CANCELLATION_POLICY_URL",
];

export function parseCommerceMode(value: string | undefined): CommerceMode {
  const mode = value ?? "internal_manual";
  if ((COMMERCE_MODES as readonly string[]).includes(mode)) return mode as CommerceMode;
  throw new Error(
    `Invalid NEXT_PUBLIC_COMMERCE_MODE "${mode}". Expected ${COMMERCE_MODES.join(" or ")}.`,
  );
}

function isEnabled(value: string | undefined): boolean {
  return value === "1" || value === "true";
}

function isAbsoluteHttpsUrl(value: string | undefined): boolean {
  if (!value) return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

export function validateCommerceEnvironment(env: CommerceEnvironment): string[] {
  const mode = parseCommerceMode(env.NEXT_PUBLIC_COMMERCE_MODE);
  const errors: string[] = [];
  const isProductionBuild = env.NODE_ENV === "production";

  if (mode === "public_live" && isProductionBuild) {
    for (const key of PUBLIC_LIVE_REQUIREMENTS) {
      if (!env[key]) errors.push(`${key} is required for public_live.`);
    }

    for (const key of [
      "NEXT_PUBLIC_PUBLIC_COMMERCE_ENABLED",
      "LIVE_PAYMENT_ENABLED",
      "LIVE_TAX_ENABLED",
      "PAYMENT_PROVIDER_CONFIGURED",
      "TAX_PROVIDER_CONFIGURED",
    ] as const) {
      if (env[key] && !isEnabled(env[key])) errors.push(`${key} must be 1 for public_live.`);
    }

    for (const key of [
      "NEXT_PUBLIC_API_BASE_URL",
      "NEXT_PUBLIC_SITE_URL",
      "NEXT_PUBLIC_PRIVACY_POLICY_URL",
      "NEXT_PUBLIC_TERMS_POLICY_URL",
      "NEXT_PUBLIC_SHIPPING_POLICY_URL",
      "NEXT_PUBLIC_CANCELLATION_POLICY_URL",
    ] as const) {
      if (env[key] && !isAbsoluteHttpsUrl(env[key])) {
        errors.push(`${key} must be an absolute HTTPS URL for public_live.`);
      }
    }
  }

  return errors;
}

export const commerceMode = parseCommerceMode(process.env.NEXT_PUBLIC_COMMERCE_MODE);
export const isInternalManualCommerce = commerceMode === "internal_manual";
