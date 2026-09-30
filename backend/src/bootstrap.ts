import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { NestExpressApplication } from "@nestjs/platform-express";
import helmet from "helmet";
import type { Server } from "http";

export const JSON_BODY_LIMIT = "256kb";
const PREVIEW_ORIGIN = /^https:\/\/bannersin48-frontend-[a-z0-9-]+\.vercel\.app$/;

/** Exact-match allowlist, plus Vercel preview deployments when explicitly enabled. */
export function isAllowedOrigin(origin: string | undefined, allowed: readonly string[], allowPreviews: boolean): boolean {
  if (!origin) return false;
  return allowed.includes(origin) || (allowPreviews && PREVIEW_ORIGIN.test(origin));
}

/**
 * HTTP hardening shared by main.ts and the e2e-style tests. Call before
 * app.init()/listen() so the body parsers registered here win over Nest's defaults.
 */
export function configureApp(app: NestExpressApplication): void {
  const config = app.get(ConfigService);

  // Caddy is the only hop in front of Nest: trust exactly one proxy, so req.ip is
  // the address Caddy saw and anything the client put in X-Forwarded-For is ignored.
  app.set("trust proxy", 1);
  app.disable("x-powered-by");

  app.use(
    helmet({
      // JSON API: nothing it serves should load subresources or be framed.
      contentSecurityPolicy: {
        useDefaults: false,
        directives: { "default-src": ["'none'"], "frame-ancestors": ["'none'"] },
      },
      // The storefront (another site) shows artwork previews with <img>. Every route
      // authenticates with a bearer token rather than ambient cookies, so allowing
      // cross-origin embedding exposes nothing a no-cors request couldn't already get.
      crossOriginResourcePolicy: { policy: "cross-origin" },
      // Caddy sets HSTS for the whole host; sending it twice invites drift.
      strictTransportSecurity: false,
    }),
  );

  // Validated values (env.validation.ts): an array, so matching is exact rather than substring.
  const allowed = config.get<unknown>("CORS_ORIGINS") ?? [];
  if (!Array.isArray(allowed)) throw new Error("CORS_ORIGINS must come from the validated environment.");
  const allowPreviews = config.get<unknown>("ALLOW_PREVIEW_ORIGINS") === true;
  app.enableCors({
    origin: (origin, callback) => callback(null, isAllowedOrigin(origin, allowed, allowPreviews)),
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Authorization", "Content-Type", "Accept", "Idempotency-Key"],
    exposedHeaders: ["Retry-After", "Content-Disposition"],
    credentials: false,
    maxAge: 600,
  });

  // No endpoint takes a large JSON body; files go through multipart (multer).
  app.useBodyParser("json", { limit: JSON_BODY_LIMIT });
  app.useBodyParser("urlencoded", { limit: JSON_BODY_LIMIT, extended: true });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strip properties not on the DTO
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  app.enableShutdownHooks();
}

/**
 * Behind Caddy. requestTimeout bounds a whole request including its body: 300 s lets a
 * 50 MB artwork upload finish on a ~1.5 Mbit/s uplink. Headers arrive in one go from
 * Caddy, so they get far less. keepAliveTimeout outlives Caddy's 2 min upstream idle
 * timeout so Caddy, not Node, closes idle connections (avoids reset-on-reuse 502s).
 */
export function configureServerTimeouts(server: Server): void {
  server.requestTimeout = 300_000;
  server.headersTimeout = 20_000;
  server.keepAliveTimeout = 125_000;
}

/** Docker's stop grace period is 30 s; everything must be down before SIGKILL. */
export const SHUTDOWN_GRACE_MS = 25_000;

/**
 * enableShutdownHooks() closes the server on SIGTERM/SIGINT, which waits for
 * in-flight requests (an upload may run for minutes). After the grace period,
 * drop whatever is still open so Prisma disconnects and the process exits in time.
 */
export function boundShutdown(server: Server, graceMs = SHUTDOWN_GRACE_MS): void {
  for (const signal of ["SIGTERM", "SIGINT"] as const) {
    process.once(signal, () => {
      setTimeout(() => server.closeAllConnections(), graceMs).unref();
    });
  }
}
