/**
 * Environment variable validation for ConfigModule.
 * Fails fast at boot when a required variable is missing.
 */
export interface Env {
  DATABASE_URL: string;
  REDIS_URL: string;
  JWT_SECRET: string;
  PORT: number;
  NODE_ENV: string;
  STORAGE_DRIVER: string;
  LOCAL_STORAGE_DIR: string;
}

export function validateEnv(config: Record<string, unknown>): Env {
  const errors: string[] = [];

  for (const required of ["DATABASE_URL", "REDIS_URL", "JWT_SECRET"]) {
    if (typeof config[required] !== "string" || (config[required] as string).length === 0) {
      errors.push(`Missing required environment variable: ${required}`);
    }
  }

  if (
    typeof config.JWT_SECRET === "string" &&
    config.JWT_SECRET.length < 32 &&
    config.NODE_ENV === "production"
  ) {
    errors.push("JWT_SECRET must be at least 32 characters in production.");
  }

  if (errors.length > 0) {
    throw new Error(`Invalid environment configuration:\n  - ${errors.join("\n  - ")}`);
  }

  return {
    DATABASE_URL: String(config.DATABASE_URL),
    REDIS_URL: String(config.REDIS_URL ?? "redis://localhost:6379"),
    JWT_SECRET: String(config.JWT_SECRET),
    PORT: Number(config.PORT ?? 3001),
    NODE_ENV: String(config.NODE_ENV ?? "development"),
    STORAGE_DRIVER: String(config.STORAGE_DRIVER ?? "local"),
    LOCAL_STORAGE_DIR: String(config.LOCAL_STORAGE_DIR ?? "./storage"),
  };
}
