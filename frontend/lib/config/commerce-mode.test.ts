import { describe, expect, it } from "vitest";
import { parseCommerceMode, validateCommerceEnvironment } from "./commerce-mode";

describe("commerce mode configuration", () => {
  it("defaults to the locked internal manual mode", () => {
    expect(parseCommerceMode(undefined)).toBe("internal_manual");
  });

  it("rejects unknown modes", () => {
    expect(() => parseCommerceMode("preview")).toThrow(/Invalid NEXT_PUBLIC_COMMERCE_MODE/);
  });

  it("blocks public production builds without live commerce and policy configuration", () => {
    const errors = validateCommerceEnvironment({
      NODE_ENV: "production",
      NEXT_PUBLIC_COMMERCE_MODE: "public_live",
    });

    expect(errors).toContain("LIVE_PAYMENT_ENABLED is required for public_live.");
    expect(errors).toContain("LIVE_TAX_ENABLED is required for public_live.");
    expect(errors).toContain("NEXT_PUBLIC_TERMS_POLICY_URL is required for public_live.");
    expect(errors).toContain("NEXT_PUBLIC_API_BASE_URL is required for public_live.");
  });

  it("accepts a fully configured public production build", () => {
    const errors = validateCommerceEnvironment({
      NODE_ENV: "production",
      NEXT_PUBLIC_COMMERCE_MODE: "public_live",
      NEXT_PUBLIC_API_BASE_URL: "https://api.example.com",
      NEXT_PUBLIC_SITE_URL: "https://shop.example.com",
      NEXT_PUBLIC_PUBLIC_COMMERCE_ENABLED: "1",
      LIVE_PAYMENT_ENABLED: "1",
      LIVE_TAX_ENABLED: "1",
      PAYMENT_PROVIDER_CONFIGURED: "1",
      TAX_PROVIDER_CONFIGURED: "1",
      NEXT_PUBLIC_PRIVACY_POLICY_URL: "https://example.com/privacy",
      NEXT_PUBLIC_TERMS_POLICY_URL: "https://example.com/terms",
      NEXT_PUBLIC_SHIPPING_POLICY_URL: "https://example.com/shipping",
      NEXT_PUBLIC_CANCELLATION_POLICY_URL: "https://example.com/cancellation",
    });

    expect(errors).toEqual([]);
  });

  it("requires access credentials for an internal production deployment", () => {
    const errors = validateCommerceEnvironment({
      NODE_ENV: "production",
      VERCEL_ENV: "production",
      NEXT_PUBLIC_COMMERCE_MODE: "internal_manual",
    });

    expect(errors).toHaveLength(2);
  });
});
