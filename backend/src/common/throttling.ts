import { ExecutionContext, SetMetadata } from "@nestjs/common";
import type { ThrottlerModuleOptions, ThrottlerOptions } from "@nestjs/throttler";

/**
 * Per-IP rate limits (in-memory; move to a Redis store before running more than one instance).
 *
 * - `default`: every route except @SkipThrottle() ones, one shared counter per IP.
 * - `auth` / `quote` / `upload`: stricter buckets that only count routes tagged
 *   with @RateLimit(bucket). Each bucket is one counter per IP across its routes.
 *
 * The tracker is Throttler's default, `req.ip` (IPv6 grouped by /64), which is
 * the Caddy-reported client address because main.ts sets `trust proxy` to 1.
 */
export const RATE_LIMIT_BUCKET = "rateLimitBucket";

export const RATE_LIMITS = {
  default: { limit: 120, ttl: 60_000 },
  auth: { limit: 10, ttl: 60_000 },
  quote: { limit: 30, ttl: 60_000 },
  upload: { limit: 20, ttl: 60_000 },
} as const;

export type RateLimitBucket = Exclude<keyof typeof RATE_LIMITS, "default">;

/** Adds the route to a stricter bucket on top of the default limit. */
export const RateLimit = (bucket: RateLimitBucket) => SetMetadata(RATE_LIMIT_BUCKET, bucket);

function bucketOf(context: ExecutionContext): string | undefined {
  return Reflect.getMetadata(RATE_LIMIT_BUCKET, context.getHandler());
}

function perIpKey(name: string) {
  return (_context: ExecutionContext, tracker: string) => `${name}:${tracker}`;
}

export function throttlerOptions(): ThrottlerModuleOptions {
  const throttlers: ThrottlerOptions[] = Object.entries(RATE_LIMITS).map(([name, { limit, ttl }]) => ({
    name,
    limit,
    ttl,
    generateKey: perIpKey(name),
    ...(name === "default" ? {} : { skipIf: (context: ExecutionContext) => bucketOf(context) !== name }),
  }));
  return {
    throttlers,
    errorMessage: "Too many requests. Please wait a minute and try again.",
  };
}
