import { randomBytes } from "crypto";
import { mkdtempSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { Controller, Get, INestApplication, Module, Post, Body, RequestMethod } from "@nestjs/common";
import { PATH_METADATA, METHOD_METADATA } from "@nestjs/common/constants";
import { ConfigModule } from "@nestjs/config";
import { MetadataScanner, ModulesContainer, Reflector } from "@nestjs/core";
import { Test } from "@nestjs/testing";
import type { NestExpressApplication } from "@nestjs/platform-express";
import type { AddressInfo } from "net";

/**
 * Boots the real AppModule (Prisma stubbed) and checks the HTTP-layer controls
 * end to end: every route is either @Public() or rejects anonymous callers,
 * the public list is exactly the intended one, rate limits bite, and the
 * helmet/CORS/body-limit/trust-proxy settings from configureApp hold.
 */
const hex = () => randomBytes(32).toString("hex");
Object.assign(process.env, {
  NODE_ENV: "test",
  DATABASE_URL: "postgresql://unused:unused@localhost:1/unused",
  JWT_SECRET: hex(),
  ADDRESS_TOKEN_SECRET: hex(),
  DOWNLOAD_URL_SECRET: hex(),
  CORS_ORIGINS: "https://www.bannersin48.test",
  ALLOW_PREVIEW_ORIGINS: "1",
  LOCAL_STORAGE_DIR: mkdtempSync(join(tmpdir(), "bi48-spec-")),
});

const { AppModule } = require("./app.module") as typeof import("./app.module");
const { PrismaService } = require("./prisma/prisma.service") as typeof import("./prisma/prisma.service");
const { configureApp, isAllowedOrigin, JSON_BODY_LIMIT } = require("./bootstrap") as typeof import("./bootstrap");
const { IS_PUBLIC_KEY, Public } = require("./common/public.decorator") as typeof import("./common/public.decorator");
const { ClientIp } = require("./common/client-ip.decorator") as typeof import("./common/client-ip.decorator");

/** The deliberate public surface. Adding a public route means adding it here too. */
const EXPECTED_PUBLIC = [
  "GET /artwork/:id/file",
  "GET /auth/me",
  "GET /catalog/banner",
  "GET /catalog/banner/:slug",
  "GET /content",
  "GET /content/:key",
  "GET /delivery/next-cutoff",
  "GET /health",
  "POST /auth/forgot-password",
  "POST /auth/login",
  "POST /auth/refresh",
  "POST /auth/register",
  "POST /auth/reset-password",
  "POST /pricing/quote",
];

interface RouteInfo {
  method: string;
  path: string;
  isPublic: boolean;
}

function listRoutes(app: INestApplication): RouteInfo[] {
  const reflector = app.get(Reflector);
  const scanner = new MetadataScanner();
  const routes: RouteInfo[] = [];
  for (const moduleRef of app.get(ModulesContainer).values()) {
    for (const wrapper of moduleRef.controllers.values()) {
      const controller = wrapper.metatype as new (...args: never[]) => object;
      const base = String(Reflect.getMetadata(PATH_METADATA, controller) ?? "");
      const proto = controller.prototype as Record<string, unknown>;
      for (const name of scanner.getAllMethodNames(proto)) {
        const handler = proto[name] as object;
        const sub = Reflect.getMetadata(PATH_METADATA, handler);
        if (sub === undefined) continue;
        const method = RequestMethod[Reflect.getMetadata(METHOD_METADATA, handler) as number];
        const path = `/${[base, String(sub)].filter((p) => p && p !== "/").join("/")}`.replace(/\/+/g, "/");
        const isPublic = reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [handler as never, controller]) === true;
        routes.push({ method, path, isPublic });
      }
    }
  }
  return routes;
}

function baseUrl(app: INestApplication): string {
  const { port } = app.getHttpServer().address() as AddressInfo;
  return `http://127.0.0.1:${port}`;
}

const prismaStub = {
  user: { findUnique: jest.fn(async () => null) },
  $connect: jest.fn(),
  $disconnect: jest.fn(),
};

async function bootApp(): Promise<NestExpressApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(PrismaService)
    .useValue(prismaStub)
    .compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>();
  configureApp(app);
  await app.listen(0, "127.0.0.1");
  return app;
}

describe("route security (global guards)", () => {
  let app: NestExpressApplication;
  beforeAll(async () => {
    app = await bootApp();
  });
  afterAll(async () => {
    await app.close();
  });

  it("exposes exactly the intended public routes", () => {
    const routes = listRoutes(app);
    expect(routes.length).toBeGreaterThan(40);
    expect(routes.filter((r) => r.isPublic).map((r) => `${r.method} ${r.path}`).sort()).toEqual(EXPECTED_PUBLIC);
  });

  it("rejects anonymous requests on every non-public route with 401", async () => {
    const guarded = listRoutes(app).filter((r) => !r.isPublic);
    const failures: string[] = [];
    for (const [i, route] of guarded.entries()) {
      const res = await fetch(`${baseUrl(app)}${route.path.replace(/:[^/]+/g, "x")}`, {
        method: route.method,
        headers: { "X-Forwarded-For": `10.1.0.${i}` }, // spread across IPs to stay clear of rate limits
      });
      if (res.status !== 401) failures.push(`${route.method} ${route.path} → ${res.status}`);
    }
    expect(failures).toEqual([]);
  });

  it("rejects a forged token on a guarded route", async () => {
    const forged = ["eyJhbGciOiJub25lIn0", Buffer.from('{"sub":"admin"}').toString("base64url"), ""].join(".");
    const res = await fetch(`${baseUrl(app)}/admin/orders`, { headers: { Authorization: `Bearer ${forged}` } });
    expect(res.status).toBe(401);
  });

  it("reads CORS_ORIGINS from the validated environment", async () => {
    const res = await fetch(`${baseUrl(app)}/catalog/banner`, {
      method: "OPTIONS",
      headers: { Origin: "https://www.bannersin48.test", "Access-Control-Request-Method": "GET" },
    });
    expect(res.headers.get("access-control-allow-origin")).toBe("https://www.bannersin48.test");
  });

  it("GET /auth/me stays public and answers null when signed out", async () => {
    const res = await fetch(`${baseUrl(app)}/auth/me`);
    expect(res.status).toBe(200);
    expect(await res.json()).toBeNull();
  });
});

describe("rate limiting", () => {
  let app: NestExpressApplication;
  beforeAll(async () => {
    app = await bootApp();
  });
  afterAll(async () => {
    await app.close();
  });

  const forgot = (ip: string) =>
    fetch(`${baseUrl(app)}/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Forwarded-For": ip },
      body: JSON.stringify({ email: "someone@example.com" }),
    });

  it("allows 10 auth requests per minute per IP, then answers 429", async () => {
    for (let i = 0; i < 10; i++) expect((await forgot("198.51.100.1")).status).toBe(201);
    const limited = await forgot("198.51.100.1");
    expect(limited.status).toBe(429);
    expect(limited.headers.get("retry-after-auth")).toBeTruthy();
    // Another client is unaffected.
    expect((await forgot("198.51.100.2")).status).toBe(201);
  });

  it("shares one auth bucket across login/register/forgot/reset", async () => {
    const ip = "198.51.100.3";
    for (let i = 0; i < 10; i++) await forgot(ip);
    const login = await fetch(`${baseUrl(app)}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Forwarded-For": ip },
      body: JSON.stringify({ email: "someone@example.com", password: "whatever" }),
    });
    expect(login.status).toBe(429);
  });

  it("limits POST /pricing/quote to 30 per minute per IP", async () => {
    const quote = () =>
      fetch(`${baseUrl(app)}/pricing/quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Forwarded-For": "198.51.100.4" },
        body: "{}",
      });
    for (let i = 0; i < 30; i++) expect((await quote()).status).not.toBe(429);
    expect((await quote()).status).toBe(429);
  });

  it("limits artwork uploads to 20 per minute per IP (counted before auth)", async () => {
    const upload = () =>
      fetch(`${baseUrl(app)}/artwork/upload`, { method: "POST", headers: { "X-Forwarded-For": "198.51.100.5" } });
    for (let i = 0; i < 20; i++) expect((await upload()).status).toBe(401);
    expect((await upload()).status).toBe(429);
  });

  it("applies a 120/min default to everything else, and never limits /health", async () => {
    const ip = "198.51.100.6";
    const statuses: number[] = [];
    for (let i = 0; i < 121; i++) {
      statuses.push((await fetch(`${baseUrl(app)}/orders`, { headers: { "X-Forwarded-For": ip } })).status);
    }
    expect(statuses.slice(0, 120).every((s) => s === 401)).toBe(true);
    expect(statuses[120]).toBe(429);
    for (let i = 0; i < 130; i++) {
      const res = await fetch(`${baseUrl(app)}/health`, { headers: { "X-Forwarded-For": ip } });
      expect(res.status).toBe(200);
    }
  });
});

describe("HTTP hardening (configureApp)", () => {
  @Controller()
  @Public()
  class ProbeController {
    @Get("ip")
    ip(@ClientIp() ip: string | undefined) {
      return { ip };
    }

    @Post("echo")
    echo(@Body() body: unknown) {
      return { received: JSON.stringify(body).length };
    }
  }

  @Module({
    imports: [
      ConfigModule.forRoot({
        ignoreEnvFile: true,
        ignoreEnvVars: true,
        load: [() => ({ CORS_ORIGINS: ["https://www.bannersin48.test"], ALLOW_PREVIEW_ORIGINS: true })],
      }),
    ],
    controllers: [ProbeController],
  })
  class ProbeModule {}

  let app: NestExpressApplication;
  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [ProbeModule] }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>();
    configureApp(app);
    await app.listen(0, "127.0.0.1");
  });
  afterAll(async () => {
    await app.close();
  });

  it("uses the proxy-reported client IP and ignores client-supplied X-Forwarded-For hops", async () => {
    const res = await fetch(`${baseUrl(app)}/ip`, { headers: { "X-Forwarded-For": "6.6.6.6, 203.0.113.7" } });
    // Caddy appends the real peer last; the forged first hop must not win.
    expect(await res.json()).toEqual({ ip: "203.0.113.7" });
    const direct = await fetch(`${baseUrl(app)}/ip`);
    expect(((await direct.json()) as { ip: string }).ip).toMatch(/127\.0\.0\.1$/);
  });

  it("sends API security headers, without HSTS (Caddy owns it)", async () => {
    const res = await fetch(`${baseUrl(app)}/ip`);
    expect(res.headers.get("content-security-policy")).toBe("default-src 'none';frame-ancestors 'none'");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("cross-origin-resource-policy")).toBe("cross-origin");
    expect(res.headers.get("strict-transport-security")).toBeNull();
    expect(res.headers.get("x-powered-by")).toBeNull();
  });

  it("answers CORS preflights only for allowed origins, without credentials", async () => {
    const preflight = (origin: string) =>
      fetch(`${baseUrl(app)}/echo`, {
        method: "OPTIONS",
        headers: {
          Origin: origin,
          "Access-Control-Request-Method": "POST",
          "Access-Control-Request-Headers": "authorization,content-type,idempotency-key",
        },
      });
    const ok = await preflight("https://www.bannersin48.test");
    expect(ok.headers.get("access-control-allow-origin")).toBe("https://www.bannersin48.test");
    expect(ok.headers.get("access-control-allow-credentials")).toBeNull();
    expect(ok.headers.get("access-control-max-age")).toBe("600");
    expect(ok.headers.get("access-control-allow-headers")?.toLowerCase()).toContain("idempotency-key");

    const preview = await preflight("https://bannersin48-frontend-git-main-acme.vercel.app");
    expect(preview.headers.get("access-control-allow-origin")).toBe("https://bannersin48-frontend-git-main-acme.vercel.app");

    const evil = await preflight("https://evil.example.com");
    expect(evil.headers.get("access-control-allow-origin")).toBeNull();
  });

  it(`rejects JSON bodies over ${JSON_BODY_LIMIT}`, async () => {
    const post = (size: number) =>
      fetch(`${baseUrl(app)}/echo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blob: "x".repeat(size) }),
      });
    expect((await post(200 * 1024)).status).toBe(201);
    expect((await post(300 * 1024)).status).toBe(413);
  });
});

describe("isAllowedOrigin", () => {
  const allowed = ["https://www.bannersin48.com", "http://localhost:3000"];

  it("matches the allowlist exactly", () => {
    expect(isAllowedOrigin("https://www.bannersin48.com", allowed, false)).toBe(true);
    expect(isAllowedOrigin("http://localhost:3000", allowed, false)).toBe(true);
    expect(isAllowedOrigin("https://www.bannersin48.com.evil.com", allowed, false)).toBe(false);
    expect(isAllowedOrigin("http://www.bannersin48.com", allowed, false)).toBe(false);
    expect(isAllowedOrigin("https://bannersin48.com", allowed, false)).toBe(false);
    expect(isAllowedOrigin(undefined, allowed, false)).toBe(false);
    expect(isAllowedOrigin("null", allowed, false)).toBe(false);
  });

  it("allows Vercel previews only when opted in, and only for the project's prefix", () => {
    const preview = "https://bannersin48-frontend-abc123-team.vercel.app";
    expect(isAllowedOrigin(preview, allowed, false)).toBe(false);
    expect(isAllowedOrigin(preview, allowed, true)).toBe(true);
    expect(isAllowedOrigin("http://bannersin48-frontend-abc.vercel.app", allowed, true)).toBe(false);
    expect(isAllowedOrigin("https://bannersin48-frontend-abc.vercel.app.evil.com", allowed, true)).toBe(false);
    expect(isAllowedOrigin("https://evil-bannersin48-frontend-abc.vercel.app", allowed, true)).toBe(false);
    expect(isAllowedOrigin("https://bannersin48-frontend-ABC.vercel.app", allowed, true)).toBe(false);
  });
});
