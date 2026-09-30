import { randomBytes } from "crypto";
import { parseOrigins, secretProblem, validateEnv } from "./env.validation";

const hex = () => randomBytes(32).toString("hex");

function env(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    DATABASE_URL: "postgresql://u:p@localhost:5432/db",
    JWT_SECRET: hex(),
    ADDRESS_TOKEN_SECRET: hex(),
    DOWNLOAD_URL_SECRET: hex(),
    ...overrides,
  };
}

describe("validateEnv", () => {
  it("accepts three distinct 256-bit secrets and applies defaults", () => {
    const result = validateEnv(env());
    expect(result.JWT_ISSUER).toBe("bannersin48-api");
    expect(result.JWT_AUDIENCE).toBe("bannersin48-web");
    expect(result.NODE_ENV).toBe("development");
    expect(result.CORS_ORIGINS).toEqual(["http://localhost:3000", "http://127.0.0.1:3000"]);
    expect(result.ALLOW_PREVIEW_ORIGINS).toBe(false);
  });

  it("accepts base64url secrets of at least 43 characters", () => {
    expect(() => validateEnv(env({ JWT_SECRET: randomBytes(32).toString("base64url") }))).not.toThrow();
  });

  it.each(["JWT_SECRET", "ADDRESS_TOKEN_SECRET", "DOWNLOAD_URL_SECRET"])("requires %s", (name) => {
    expect(() => validateEnv(env({ [name]: undefined }))).toThrow(new RegExp(`${name} is required`));
    expect(() => validateEnv(env({ [name]: "" }))).toThrow(new RegExp(`${name} is required`));
  });

  it("validates secrets whatever NODE_ENV is (unset, development, test)", () => {
    for (const NODE_ENV of [undefined, "development", "test"]) {
      expect(() => validateEnv(env({ NODE_ENV, JWT_SECRET: "short" }))).toThrow(/JWT_SECRET/);
    }
  });

  it.each([
    ["the old committed placeholder", "change-me-to-a-long-random-string"],
    ["a long placeholder", "changeme".repeat(10)],
    ["an example value", `example${hex()}`],
    ["a 'secret' value", `${"a1b2c3d4e5f6a7b8c9d0".repeat(3)}secret`],
    ["a test value", `test_${hex()}`],
    ["a password value", `password_${hex()}`],
  ])("rejects %s", (_label, value) => {
    expect(() => validateEnv(env({ JWT_SECRET: value }))).toThrow(/JWT_SECRET looks like a placeholder/);
  });

  it("rejects short secrets", () => {
    expect(() => validateEnv(env({ JWT_SECRET: randomBytes(31).toString("hex") }))).toThrow(/at least 64 hex/);
    expect(() => validateEnv(env({ JWT_SECRET: randomBytes(24).toString("base64url") }))).toThrow(/at least 43 base64url/);
    // 33 characters of the old kind of value: long enough for the old check, far too weak now.
    expect(secretProblem("a".repeat(33))).not.toBeNull();
  });

  it("rejects low-variety and non-base64url secrets", () => {
    expect(() => validateEnv(env({ JWT_SECRET: "ab".repeat(40) }))).toThrow(/too little variety/);
    expect(() => validateEnv(env({ JWT_SECRET: `${hex()}!@#` }))).toThrow(/hex or base64url/);
  });

  it("requires the three secrets to differ", () => {
    const shared = hex();
    expect(() => validateEnv(env({ JWT_SECRET: shared, ADDRESS_TOKEN_SECRET: shared }))).toThrow(/must all be different/);
  });

  it("requires https CORS_ORIGINS in production and rejects malformed origins", () => {
    expect(() => validateEnv(env({ NODE_ENV: "production" }))).toThrow(/CORS_ORIGINS/);
    expect(() => validateEnv(env({ NODE_ENV: "production", CORS_ORIGINS: "http://shop.example.com" }))).toThrow(/https/);
    expect(() => validateEnv(env({ CORS_ORIGINS: "https://shop.example.com/" }))).toThrow(/invalid origins/);
    expect(() => validateEnv(env({ CORS_ORIGINS: "*" }))).toThrow(/invalid origins/);
    const ok = validateEnv(
      env({
        NODE_ENV: "production",
        CORS_ORIGINS: "https://www.bannersin48.com, https://bannersin48.com",
        ALLOW_PREVIEW_ORIGINS: "1",
        API_DOMAIN: "api.bannersin48.com",
      }),
    );
    expect(ok.CORS_ORIGINS).toEqual(["https://www.bannersin48.com", "https://bannersin48.com"]);
    expect(ok.ALLOW_PREVIEW_ORIGINS).toBe(true);
  });

  it("derives the public API origin for signed links: PUBLIC_API_URL, then API_DOMAIN, then localhost", () => {
    expect(validateEnv(env({ PORT: "4000" })).PUBLIC_API_URL).toBe("http://localhost:4000");
    expect(validateEnv(env({ API_DOMAIN: "179-236-230-7.sslip.io" })).PUBLIC_API_URL).toBe("https://179-236-230-7.sslip.io");
    expect(validateEnv(env({ API_DOMAIN: "x.io", PUBLIC_API_URL: "https://api.example.com" })).PUBLIC_API_URL).toBe(
      "https://api.example.com",
    );
    const prod = { NODE_ENV: "production", CORS_ORIGINS: "https://www.bannersin48.com" };
    expect(() => validateEnv(env(prod))).toThrow(/API_DOMAIN or PUBLIC_API_URL/);
    expect(() => validateEnv(env({ ...prod, PUBLIC_API_URL: "http://api.example.com" }))).toThrow(/https/);
    expect(() => validateEnv(env({ PUBLIC_API_URL: "https://api.example.com/v1" }))).toThrow(/PUBLIC_API_URL/);
    expect(() => validateEnv(env({ API_DOMAIN: "https://api.example.com" }))).toThrow(/API_DOMAIN/);
  });

  it("applies upload defaults (4 in flight, 2 GiB and 500 files per user) and validates overrides", () => {
    const defaults = validateEnv(env());
    expect(defaults.UPLOAD_MAX_CONCURRENCY).toBe(4);
    expect(defaults.ARTWORK_QUOTA_BYTES).toBe(2 * 1024 ** 3);
    expect(defaults.ARTWORK_QUOTA_FILES).toBe(500);
    const custom = validateEnv(env({ UPLOAD_MAX_CONCURRENCY: "2", ARTWORK_QUOTA_BYTES: "104857600", ARTWORK_QUOTA_FILES: "50" }));
    expect(custom).toMatchObject({ UPLOAD_MAX_CONCURRENCY: 2, ARTWORK_QUOTA_BYTES: 104857600, ARTWORK_QUOTA_FILES: 50 });
    expect(() => validateEnv(env({ UPLOAD_MAX_CONCURRENCY: "0" }))).toThrow(/UPLOAD_MAX_CONCURRENCY/);
    expect(() => validateEnv(env({ ARTWORK_QUOTA_FILES: "lots" }))).toThrow(/ARTWORK_QUOTA_FILES/);
    expect(() => validateEnv(env({ ARTWORK_QUOTA_BYTES: "1.5" }))).toThrow(/ARTWORK_QUOTA_BYTES/);
  });

  it("rejects an unknown NODE_ENV", () => {
    expect(() => validateEnv(env({ NODE_ENV: "prod" }))).toThrow(/NODE_ENV/);
  });

  it("parses origin lists exactly", () => {
    expect(parseOrigins("https://a.com,https://b.com:8443")).toEqual({ origins: ["https://a.com", "https://b.com:8443"], invalid: [] });
    expect(parseOrigins("https://a.com/path").invalid).toEqual(["https://a.com/path"]);
  });
});
