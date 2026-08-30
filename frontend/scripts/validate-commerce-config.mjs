const mode = process.env.NEXT_PUBLIC_COMMERCE_MODE ?? "internal_manual";
const validModes = new Set(["internal_manual", "public_live"]);
const errors = [];

if (!validModes.has(mode)) {
  errors.push(`NEXT_PUBLIC_COMMERCE_MODE must be internal_manual or public_live (received ${mode}).`);
}

const productionBuild = process.env.NODE_ENV === "production";

if (mode === "public_live" && productionBuild) {
  const enabledKeys = [
    "NEXT_PUBLIC_PUBLIC_COMMERCE_ENABLED",
    "LIVE_PAYMENT_ENABLED",
    "LIVE_TAX_ENABLED",
    "PAYMENT_PROVIDER_CONFIGURED",
    "TAX_PROVIDER_CONFIGURED",
  ];
  const urlKeys = [
    "NEXT_PUBLIC_API_BASE_URL",
    "NEXT_PUBLIC_SITE_URL",
    "NEXT_PUBLIC_PRIVACY_POLICY_URL",
    "NEXT_PUBLIC_TERMS_POLICY_URL",
    "NEXT_PUBLIC_SHIPPING_POLICY_URL",
    "NEXT_PUBLIC_CANCELLATION_POLICY_URL",
  ];

  for (const key of enabledKeys) {
    if (!new Set(["1", "true"]).has(process.env[key])) {
      errors.push(`${key} must be 1 for public_live.`);
    }
  }
  for (const key of urlKeys) {
    const value = process.env[key];
    try {
      if (!value || new URL(value).protocol !== "https:") throw new Error("invalid");
    } catch {
      errors.push(`${key} must be an absolute HTTPS URL for public_live.`);
    }
  }
}

if (errors.length > 0) {
  console.error("Commerce configuration is unsafe:\n- " + errors.join("\n- "));
  process.exit(1);
}

console.log(`Commerce configuration valid (${mode}).`);
