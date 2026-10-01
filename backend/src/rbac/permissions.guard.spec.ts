import { ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PermissionsGuard } from "./permissions.guard";
import { RequireAnyPermission, RequirePermissions } from "./require-permissions.decorator";
import { ADMIN_WILDCARD, type EffectivePermissions } from "./permissions";

@RequirePermissions("orders:read")
class Routes {
  inherits() {}

  @RequirePermissions("payments:mark_paid")
  markPaid() {}

  @RequirePermissions("catalog:write", "pricing:write")
  both() {}

  @RequireAnyPermission("orders:hold", "orders:cancel")
  either() {}
}

class OpenRoutes {
  open() {}
}

function contextFor(permissions: EffectivePermissions | undefined, handler: keyof Routes | "open"): ExecutionContext {
  const cls = handler === "open" ? OpenRoutes : Routes;
  return {
    switchToHttp: () => ({ getRequest: () => ({ user: permissions === undefined ? undefined : { id: "u1", permissions } }) }),
    getHandler: () => (cls.prototype as unknown as Record<string, unknown>)[handler],
    getClass: () => cls,
  } as unknown as ExecutionContext;
}

const guard = new PermissionsGuard(new Reflector());
const set = (...keys: string[]) => new Set(keys) as unknown as EffectivePermissions;
const codeOf = (fn: () => unknown) => {
  try {
    fn();
    return null;
  } catch (err) {
    return (err as { response: { code: string; required: string[] } }).response;
  }
};

describe("PermissionsGuard", () => {
  it("passes when no metadata is present (customer routes stay ownership-scoped)", () => {
    expect(guard.canActivate(contextFor(undefined, "open"))).toBe(true);
    expect(guard.canActivate(contextFor(set(), "open"))).toBe(true);
  });

  it("lets the admin wildcard through everything", () => {
    expect(guard.canActivate(contextFor(ADMIN_WILDCARD, "markPaid"))).toBe(true);
    expect(guard.canActivate(contextFor(ADMIN_WILDCARD, "both"))).toBe(true);
    expect(guard.canActivate(contextFor(ADMIN_WILDCARD, "either"))).toBe(true);
  });

  it("passes a listed key and answers 403 FORBIDDEN_PERMISSION with `required` when it is missing", () => {
    expect(guard.canActivate(contextFor(set("payments:mark_paid"), "markPaid"))).toBe(true);
    expect(codeOf(() => guard.canActivate(contextFor(set("orders:read"), "markPaid")))).toEqual({
      code: "FORBIDDEN_PERMISSION",
      message: expect.any(String),
      required: ["payments:mark_paid"],
    });
  });

  it("uses class metadata when the handler has none, and handler metadata overrides it", () => {
    expect(guard.canActivate(contextFor(set("orders:read"), "inherits"))).toBe(true);
    expect(codeOf(() => guard.canActivate(contextFor(set("payments:mark_paid"), "inherits")))?.required).toEqual(["orders:read"]);
    // markPaid replaces the class-level orders:read rather than adding to it.
    expect(guard.canActivate(contextFor(set("payments:mark_paid"), "markPaid"))).toBe(true);
  });

  it("requires every key for @RequirePermissions and reports only the missing ones", () => {
    expect(guard.canActivate(contextFor(set("catalog:write", "pricing:write"), "both"))).toBe(true);
    expect(codeOf(() => guard.canActivate(contextFor(set("catalog:write"), "both")))?.required).toEqual(["pricing:write"]);
  });

  it("requires any one key for @RequireAnyPermission, without inheriting the class-level list", () => {
    expect(guard.canActivate(contextFor(set("orders:cancel"), "either"))).toBe(true);
    expect(codeOf(() => guard.canActivate(contextFor(set("orders:read"), "either")))?.required).toEqual(["orders:hold", "orders:cancel"]);
  });

  it("rejects unauthenticated requests on guarded routes", () => {
    expect(() => guard.canActivate(contextFor(undefined, "markPaid"))).toThrow(UnauthorizedException);
  });
});
