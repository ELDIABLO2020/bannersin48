import { ExecutionContext, SetMetadata } from "@nestjs/common";
import type { ThrottlerModuleOptions, ThrottlerOptions } from "@nestjs/throttler";

/**
 * Per-IP rate limits (in-memory; move to a Redis store before running more than one instance).
 *
 * - `default`: every route except @SkipThrottle() ones and routes in a standalone
 *   bucket, one shared counter per IP.
 * - `auth` / `quote` / `upload`: stricter buckets that only count routes tagged
 *   with @RateLimit(bucket), on top of `default`. Each bucket is one counter per IP.
 * - `download`: standalone bucket for signed file links (a library grid loads many
 *   previews at once), counted instead of `default`.
 * - `sensitive`: staff mutations that mint credentials or move money (create a
 *   staff account, admin password resets, invite resend, reward adjustments). A
 *   stolen staff token gets 20 of them a minute, not 120.
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
  download: { limit: 300, ttl: 60_000 },
  sensitive: { limit: 20, ttl: 60_000 },
} as const;

/** Buckets whose routes are not also counted by `default`. */
const STANDALONE_BUCKETS: ReadonlySet<string> = new Set(["download"]);

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
    skipIf:
      name === "default"
        ? (context: ExecutionContext) => STANDALONE_BUCKETS.has(bucketOf(context) ?? "")
        : (context: ExecutionContext) => bucketOf(context) !== name,
  }));
  return {
    throttlers,
    errorMessage: "Too many requests. Please wait a minute and try again.",
  };
}
