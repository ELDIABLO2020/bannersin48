import { randomBytes } from "crypto";
import { mkdtempSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { RequestMethod } from "@nestjs/common";
import { PATH_METADATA, METHOD_METADATA } from "@nestjs/common/constants";
import { MetadataScanner, ModulesContainer, Reflector } from "@nestjs/core";
import { Test } from "@nestjs/testing";

/**
 * Deny-by-default for the admin surface, made structural: boots the real
 * AppModule (Prisma stubbed), lists every route and fails if any route under
 * /admin lacks @RequirePermissions / @RequireAnyPermission metadata on its
 * handler or controller. Also checks that every key named in a decorator is
 * in the catalog, and that nothing outside /admin is permission-gated by
 * accident (customer routes stay ownership-scoped in their services).
 */
const hex = () => randomBytes(32).toString("hex");
Object.assign(process.env, {
  NODE_ENV: "test",
  DATABASE_URL: "postgresql://unused:unused@localhost:1/unused",
  JWT_SECRET: hex(),
  ADDRESS_TOKEN_SECRET: hex(),
  DOWNLOAD_URL_SECRET: hex(),
  CORS_ORIGINS: "https://www.bannersin48.test",
  LOCAL_STORAGE_DIR: mkdtempSync(join(tmpdir(), "bi48-rbac-spec-")),
});

const { AppModule } = require("../app.module") as typeof import("../app.module");
const { PrismaService } = require("../prisma/prisma.service") as typeof import("../prisma/prisma.service");
const { PERMISSION_KEYS } = require("./permissions") as typeof import("./permissions");
const { requiredPermissions } = require("./permissions.guard") as typeof import("./permissions.guard");
const { ROLES_KEY } = require("../common/roles.decorator") as typeof import("../common/roles.decorator");
const { IS_PUBLIC_KEY } = require("../common/public.decorator") as typeof import("../common/public.decorator");

interface RouteInfo {
  method: string;
  path: string;
  required: string[] | undefined;
  /** Legacy coarse `@Roles` metadata (handler or controller). Must be absent under /admin since phase 5. */
  roles: string[] | undefined;
  isPublic: boolean;
}

const prismaStub = {
  user: { findUnique: jest.fn(async () => null) },
  permission: { findMany: jest.fn(async () => []), upsert: jest.fn() },
  accessRole: { findUnique: jest.fn(async () => null), create: jest.fn(async ({ data }: { data: { key: string } }) => ({ id: `role_${data.key}` })) },
  rolePermission: { createMany: jest.fn() },
  $connect: jest.fn(),
  $disconnect: jest.fn(),
};

let routes: RouteInfo[] = [];

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).overrideProvider(PrismaService).useValue(prismaStub).compile();
  const reflector = moduleRef.get(Reflector);
  const scanner = new MetadataScanner();
  for (const module of moduleRef.get(ModulesContainer).values()) {
    for (const wrapper of module.controllers.values()) {
      const controller = wrapper.metatype as new (...args: never[]) => object;
      const base = String(Reflect.getMetadata(PATH_METADATA, controller) ?? "");
      const proto = controller.prototype as Record<string, unknown>;
      for (const name of scanner.getAllMethodNames(proto)) {
        const handler = proto[name] as object;
        const sub = Reflect.getMetadata(PATH_METADATA, handler);
        if (sub === undefined) continue;
        const method = RequestMethod[Reflect.getMetadata(METHOD_METADATA, handler) as number];
        const path = `/${[base, String(sub)].filter((p) => p && p !== "/").join("/")}`.replace(/\/+/g, "/");
        const { all, any } = requiredPermissions(reflector, handler, controller);
        const required = all || any ? [...(all ?? []), ...(any ?? [])] : undefined;
        const targets = [handler, controller] as never[];
        const roles = reflector.getAllAndOverride(ROLES_KEY, targets) as string[] | undefined;
        const isPublic = Boolean(reflector.getAllAndOverride(IS_PUBLIC_KEY, targets));
        routes.push({ method, path, required, roles, isPublic });
      }
    }
  }
  routes = routes.sort((a, b) => `${a.path} ${a.method}`.localeCompare(`${b.path} ${b.method}`));
});

describe("permission coverage", () => {
  it("found the admin surface", () => {
    expect(routes.filter((r) => r.path.startsWith("/admin")).length).toBeGreaterThan(20);
  });

  it("reads handler metadata and inherited controller metadata (so the scan is not vacuous)", () => {
    const find = (method: string, path: string) => routes.find((r) => r.method === method && r.path === path)?.required;
    expect(find("POST", "/admin/orders/:id/mark-paid")).toEqual(["payments:mark_paid"]);
    expect(find("GET", "/admin/orders/buckets")).toEqual(["orders:read"]); // class-level
    expect(find("POST", "/admin/orders/:id/status")).toEqual(["orders:update_status", "orders:hold", "orders:cancel"]);
    expect(find("PATCH", "/admin/products/:id/materials/:materialId")).toEqual(["catalog:write", "pricing:write"]);
    expect(find("POST", "/admin/customers/:id/reset-password")).toEqual(["customers:reset_password", "users:reset_password"]);
    expect(find("PUT", "/admin/content/:key")).toEqual(["content:edit"]);
  });

  it("gates every /admin/* route with @RequirePermissions or @RequireAnyPermission", () => {
    const unguarded = routes.filter((r) => r.path.startsWith("/admin") && (!r.required || r.required.length === 0));
    expect(unguarded.map((r) => `${r.method} ${r.path}`)).toEqual([]);
  });

  it("only names permissions that exist in the catalog", () => {
    const unknown = routes.flatMap((r) => (r.required ?? []).filter((key) => !(PERMISSION_KEYS as readonly string[]).includes(key)).map((key) => `${r.method} ${r.path} → ${key}`));
    expect(unknown).toEqual([]);
  });

  it("carries no legacy @Roles metadata under /admin (phase 5: permissions are the only gate)", () => {
    const withRoles = routes.filter((r) => r.path.startsWith("/admin") && r.roles && r.roles.length > 0);
    expect(withRoles.map((r) => `${r.method} ${r.path}`)).toEqual([]);
  });

  it("never exposes an /admin route as @Public", () => {
    const open = routes.filter((r) => r.path.startsWith("/admin") && r.isPublic);
    expect(open.map((r) => `${r.method} ${r.path}`)).toEqual([]);
  });

  it("leaves customer and public routes ungated (ownership is enforced in services)", () => {
    const gatedOutsideAdmin = routes.filter((r) => !r.path.startsWith("/admin") && r.required && r.required.length > 0);
    expect(gatedOutsideAdmin.map((r) => `${r.method} ${r.path}`)).toEqual([]);
  });
});
