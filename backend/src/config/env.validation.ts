/**
 * Environment variable validation for ConfigModule.
 * Runs on every boot, whatever NODE_ENV says, and fails fast on a missing or weak secret.
 */
export interface Env {
  DATABASE_URL: string;
  JWT_SECRET: string;
  JWT_ISSUER: string;
  JWT_AUDIENCE: string;
  ADDRESS_TOKEN_SECRET: string;
  DOWNLOAD_URL_SECRET: string;
  CORS_ORIGINS: string[];
  ALLOW_PREVIEW_ORIGINS: boolean;
  PORT: number;
  NODE_ENV: "development" | "test" | "production";
  STORAGE_DRIVER: string;
  LOCAL_STORAGE_DIR: string;
}

export const SECRET_VARS = ["JWT_SECRET", "ADDRESS_TOKEN_SECRET", "DOWNLOAD_URL_SECRET"] as const;

export const DEFAULT_JWT_ISSUER = "bannersin48-api";
export const DEFAULT_JWT_AUDIENCE = "bannersin48-web";
const DEV_CORS_ORIGINS = ["http://localhost:3000", "http://127.0.0.1:3000"];
const NODE_ENVS = ["development", "test", "production"] as const;

const PLACEHOLDER = /change-?me|example|placeholder|secret|password|test/i;
const HEX = /^[0-9a-f]+$/i;
const BASE64URL = /^[A-Za-z0-9_-]+$/;
const GENERATE_HINT = "generate one with `openssl rand -hex 32`";

/** Returns a reason the value is not a usable 256-bit secret, or null when it is. */
export function secretProblem(value: unknown): string | null {
  if (typeof value !== "string" || value.length === 0) return "is required";
  if (PLACEHOLDER.test(value)) return "looks like a placeholder";
  if (HEX.test(value)) {
    if (value.length < 64) return "must be at least 64 hex characters (256 bits)";
  } else if (BASE64URL.test(value)) {
    if (value.length < 43) return "must be at least 43 base64url characters (256 bits)";
  } else {
    return "must be hex or base64url";
  }
  if (new Set(value).size < 12) return "has too little variety to be random";
  return null;
}

/** Exact `scheme://host[:port]` origins; anything with a path, wildcard or trailing slash is rejected. */
export function parseOrigins(raw: string): { origins: string[]; invalid: string[] } {
  const origins: string[] = [];
  const invalid: string[] = [];
  for (const entry of raw.split(",").map((s) => s.trim()).filter(Boolean)) {
    try {
      const url = new URL(entry);
      if (url.origin === entry && (url.protocol === "https:" || url.protocol === "http:")) {
        origins.push(entry);
        continue;
      }
    } catch {
      // fall through
    }
    invalid.push(entry);
  }
  return { origins, invalid };
}

export function validateEnv(config: Record<string, unknown>): Env {
  const errors: string[] = [];
  const str = (key: string): string | undefined =>
    typeof config[key] === "string" && (config[key] as string).length > 0 ? (config[key] as string) : undefined;

  const nodeEnv = str("NODE_ENV") ?? "development";
  if (!(NODE_ENVS as readonly string[]).includes(nodeEnv)) {
    errors.push(`NODE_ENV must be one of ${NODE_ENVS.join(", ")}.`);
  }
  const production = nodeEnv === "production";

  if (!str("DATABASE_URL")) errors.push("Missing required environment variable: DATABASE_URL");

  for (const name of SECRET_VARS) {
    const problem = secretProblem(config[name]);
    if (problem) errors.push(`${name} ${problem}; ${GENERATE_HINT}.`);
  }
  const secrets = SECRET_VARS.map((name) => str(name)).filter((v): v is string => Boolean(v));
  if (new Set(secrets).size !== secrets.length) {
    errors.push(`${SECRET_VARS.join(", ")} must all be different values.`);
  }

  let corsOrigins = production ? [] : DEV_CORS_ORIGINS;
  const rawOrigins = str("CORS_ORIGINS");
  if (rawOrigins) {
    const { origins, invalid } = parseOrigins(rawOrigins);
    if (invalid.length > 0) errors.push(`CORS_ORIGINS has invalid origins: ${invalid.join(", ")}`);
    if (production && origins.some((o) => o.startsWith("http:"))) {
      errors.push("CORS_ORIGINS must use https:// origins in production.");
    }
    corsOrigins = origins;
  } else if (production) {
    errors.push("Missing required environment variable: CORS_ORIGINS (comma-separated frontend origins)");
  }

  const port = Number(config.PORT ?? 3001);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) errors.push("PORT must be a valid port number.");

  if (errors.length > 0) {
    throw new Error(`Invalid environment configuration:\n  - ${errors.join("\n  - ")}`);
  }

  return {
    DATABASE_URL: String(config.DATABASE_URL),
    JWT_SECRET: String(config.JWT_SECRET),
    JWT_ISSUER: str("JWT_ISSUER") ?? DEFAULT_JWT_ISSUER,
    JWT_AUDIENCE: str("JWT_AUDIENCE") ?? DEFAULT_JWT_AUDIENCE,
    ADDRESS_TOKEN_SECRET: String(config.ADDRESS_TOKEN_SECRET),
    DOWNLOAD_URL_SECRET: String(config.DOWNLOAD_URL_SECRET),
    CORS_ORIGINS: corsOrigins,
    ALLOW_PREVIEW_ORIGINS: str("ALLOW_PREVIEW_ORIGINS") === "1",
    PORT: port,
    NODE_ENV: nodeEnv as Env["NODE_ENV"],
    STORAGE_DRIVER: str("STORAGE_DRIVER") ?? "local",
    LOCAL_STORAGE_DIR: str("LOCAL_STORAGE_DIR") ?? "./storage",
  };
}
