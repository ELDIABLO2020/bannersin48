import { ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { jwtOptions } from "../auth/auth.module";
import { PrismaService } from "../prisma/prisma.service";
import { RbacService } from "../rbac/rbac.service";
import type { AuditService } from "../audit/audit.service";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { Public } from "./public.decorator";
import { AllowPasswordChangeRequired } from "./password-change.decorator";

const SECRET = "0123456789abcdef".repeat(4);
const ISS = "bannersin48-api";
const AUD = "bannersin48-web";

type Row = Record<string, unknown>;
const dbUsers: Record<string, Row> = {
  u1: { id: "u1", email: "c@test.com", role: "CUSTOMER", status: "ACTIVE" },
  u2: { id: "u2", email: "gone@test.com", role: "ADMIN", status: "SUSPENDED" },
  // Backfilled staff: the role row carries the permissions; an ALLOW override adds one, a DENY removes one.
  u3: {
    id: "u3",
    email: "s@test.com",
    role: "STAFF",
    status: "ACTIVE",
    accessRole: { key: "fulfillment", permissions: [{ permissionKey: "orders:read" }, { permissionKey: "orders:tracking" }] },
    permissionOverrides: [
      { permissionKey: "payments:mark_paid", effect: "ALLOW", expiresAt: null },
      { permissionKey: "orders:tracking", effect: "DENY", expiresAt: null },
    ],
  },
  // Not yet backfilled (roleId null): the legacy enum's default set applies.
  u4: { id: "u4", email: "legacy@test.com", role: "STAFF", status: "ACTIVE", accessRole: null, permissionOverrides: [] },
  u5: { id: "u5", email: "admin@test.com", role: "ADMIN", status: "ACTIVE", accessRole: { key: "admin", permissions: [] } },
  // Created by staff with a temporary password: may only sign out or change the password.
  u6: { id: "u6", email: "temp@test.com", role: "STAFF", status: "ACTIVE", mustChangePassword: true, accessRole: { key: "staff", permissions: [] } },
};
const prisma = { user: { findUnique: jest.fn(async ({ where }: { where: { id: string } }) => dbUsers[where.id] ?? null) } };
const jwt = new JwtService(jwtOptions(SECRET));
const rbac = new RbacService(prisma as unknown as PrismaService, {} as AuditService);
const guard = new JwtAuthGuard(jwt, prisma as unknown as PrismaService, new Reflector(), rbac);

class Routes {
  guarded() {}
  @Public()
  open() {}
  @AllowPasswordChangeRequired()
  changePassword() {}
}

function contextFor(token: string | undefined, handler: keyof Routes = "guarded", query: Record<string, unknown> = {}) {
  const request: Record<string, unknown> = {
    headers: token ? { authorization: `Bearer ${token}` } : {},
    query,
  };
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => Routes.prototype[handler],
    getClass: () => Routes,
  } as unknown as ExecutionContext;
  return { context, request };
}

function sign(payload: object, options: Record<string, unknown> = {}): string {
  return new JwtService({ secret: SECRET }).sign(payload, { algorithm: "HS256", issuer: ISS, audience: AUD, expiresIn: "5m", ...options });
}

describe("JwtAuthGuard", () => {
  it("accepts an HS256 token with the right issuer and audience", async () => {
    const { context, request } = contextFor(sign({ sub: "u1" }));
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toEqual({ id: "u1", email: "c@test.com", role: "CUSTOMER", roleKey: null, permissions: new Set(), mustChangePassword: false, sessionId: null });
  });

  it("carries the session id from `sid` and ignores a malformed one", async () => {
    const withSid = contextFor(sign({ sub: "u1", sid: "rt_123" }));
    await expect(guard.canActivate(withSid.context)).resolves.toBe(true);
    expect(withSid.request.user).toMatchObject({ id: "u1", sessionId: "rt_123" });

    const malformed = contextFor(sign({ sub: "u1", sid: 42 }));
    await expect(guard.canActivate(malformed.context)).resolves.toBe(true);
    expect(malformed.request.user).toMatchObject({ sessionId: null });
  });

  it("blocks a temporary-password account everywhere except routes that allow the change", async () => {
    const blocked = contextFor(sign({ sub: "u6" }));
    await expect(guard.canActivate(blocked.context)).rejects.toMatchObject({ response: { code: "PASSWORD_CHANGE_REQUIRED" } });
    expect(blocked.request.user).toBeUndefined();

    const allowed = contextFor(sign({ sub: "u6" }), "changePassword");
    await expect(guard.canActivate(allowed.context)).resolves.toBe(true);
    expect(allowed.request.user).toMatchObject({ id: "u6", mustChangePassword: true });
  });

  it("takes the role from the database, never from the token", async () => {
    const { context, request } = contextFor(sign({ sub: "u1", role: "ADMIN", email: "admin@x.com", permissions: ["*"] }));
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toMatchObject({ role: "CUSTOMER", email: "c@test.com", permissions: new Set() });
  });

  it("resolves permissions from the role row and overrides, loading them with the user", async () => {
    const { context, request } = contextFor(sign({ sub: "u3" }));
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toMatchObject({ roleKey: "fulfillment", permissions: new Set(["orders:read", "payments:mark_paid"]) });
    const call = prisma.user.findUnique.mock.calls.at(-1)![0] as unknown as { include: Record<string, unknown> };
    expect(Object.keys(call.include).sort()).toEqual(["accessRole", "permissionOverrides"]);
  });

  it("falls back to the legacy enum's default set while roleId is unset, and admin resolves to the wildcard", async () => {
    const legacy = contextFor(sign({ sub: "u4" }));
    await guard.canActivate(legacy.context);
    const perms = (legacy.request.user as { permissions: Set<string> }).permissions;
    expect(perms.has("orders:read")).toBe(true);
    expect(perms.has("payments:mark_paid")).toBe(false); // stripped from default staff

    const admin = contextFor(sign({ sub: "u5" }));
    await guard.canActivate(admin.context);
    expect(admin.request.user).toMatchObject({ roleKey: "admin", permissions: "*" });
  });

  it.each([
    ["another HMAC algorithm (HS384)", () => sign({ sub: "u1" }, { algorithm: "HS384" })],
    ["HS512", () => sign({ sub: "u1" }, { algorithm: "HS512" })],
    ["a wrong issuer", () => sign({ sub: "u1" }, { issuer: "someone-else" })],
    ["a wrong audience", () => sign({ sub: "u1" }, { audience: "another-app" })],
    ["no issuer or audience", () => new JwtService({ secret: SECRET }).sign({ sub: "u1" }, { algorithm: "HS256" })],
    ["a different secret", () => new JwtService({ secret: "f".repeat(64) }).sign({ sub: "u1" }, { algorithm: "HS256", issuer: ISS, audience: AUD })],
    [
      "an expired token",
      () =>
        new JwtService({ secret: SECRET }).sign(
          { sub: "u1", exp: Math.floor(Date.now() / 1000) - 10 },
          { algorithm: "HS256", issuer: ISS, audience: AUD },
        ),
    ],
    [
      "alg none",
      () =>
        [
          Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url"),
          Buffer.from(JSON.stringify({ sub: "u1", iss: ISS, aud: AUD, exp: Math.floor(Date.now() / 1000) + 60 })).toString("base64url"),
          "",
        ].join("."),
    ],
    ["a missing sub", () => sign({ foo: "bar" })],
  ])("rejects %s", async (_label, makeToken) => {
    await expect(guard.canActivate(contextFor(makeToken()).context)).rejects.toThrow(UnauthorizedException);
  });

  it("rejects missing tokens and suspended accounts", async () => {
    await expect(guard.canActivate(contextFor(undefined).context)).rejects.toThrow(UnauthorizedException);
    await expect(guard.canActivate(contextFor(sign({ sub: "u2" })).context)).rejects.toThrow(/not active/);
  });

  it("lets @Public() routes through without a token", async () => {
    await expect(guard.canActivate(contextFor(undefined, "open").context)).resolves.toBe(true);
  });

  it("ignores ?access_token= (tokens never travel in URLs; file links are signed instead)", async () => {
    const { context, request } = contextFor(undefined, "guarded", { access_token: sign({ sub: "u1" }) });
    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    expect(request.user).toBeUndefined();
  });
});
