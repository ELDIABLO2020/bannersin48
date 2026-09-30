import { ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { jwtOptions } from "../auth/auth.module";
import { PrismaService } from "../prisma/prisma.service";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { Public } from "./public.decorator";

const SECRET = "0123456789abcdef".repeat(4);
const ISS = "bannersin48-api";
const AUD = "bannersin48-web";

const dbUsers: Record<string, { id: string; email: string; role: string; status: string }> = {
  u1: { id: "u1", email: "c@test.com", role: "CUSTOMER", status: "ACTIVE" },
  u2: { id: "u2", email: "gone@test.com", role: "ADMIN", status: "SUSPENDED" },
};
const prisma = { user: { findUnique: jest.fn(async ({ where }: { where: { id: string } }) => dbUsers[where.id] ?? null) } };
const jwt = new JwtService(jwtOptions(SECRET));
const guard = new JwtAuthGuard(jwt, prisma as unknown as PrismaService, new Reflector());

class Routes {
  guarded() {}
  @Public()
  open() {}
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
    expect(request.user).toEqual({ id: "u1", email: "c@test.com", role: "CUSTOMER" });
  });

  it("takes the role from the database, never from the token", async () => {
    const { context, request } = contextFor(sign({ sub: "u1", role: "ADMIN", email: "admin@x.com" }));
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toMatchObject({ role: "CUSTOMER", email: "c@test.com" });
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

  it("still accepts ?access_token= (image previews) until signed download URLs land", async () => {
    const { context, request } = contextFor(undefined, "guarded", { access_token: sign({ sub: "u1" }) });
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toMatchObject({ id: "u1" });
  });
});
