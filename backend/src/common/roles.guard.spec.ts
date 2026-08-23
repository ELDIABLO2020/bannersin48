import { ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { RolesGuard } from "./roles.guard";

function makeGuard(roles?: string[]): RolesGuard {
  return new RolesGuard({
    getAllAndOverride: () => roles,
  } as unknown as Reflector);
}

function contextWith(user: { role: string } | undefined): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe("RolesGuard", () => {
  const guard = makeGuard(["STAFF"]);

  it("allows ADMIN into STAFF routes", () => {
    expect(guard.canActivate(contextWith({ role: "ADMIN" }))).toBe(true);
  });

  it("allows a listed role", () => {
    expect(guard.canActivate(contextWith({ role: "STAFF" }))).toBe(true);
  });

  it("forbids unlisted roles (customer on staff route)", () => {
    try {
      guard.canActivate(contextWith({ role: "CUSTOMER" }));
      throw new Error("should not reach here");
    } catch (err) {
      expect((err as { response: { code: string } }).response.code).toBe("FORBIDDEN_ROLE");
      expect(() => guard.canActivate(contextWith({ role: "CONTENT_EDITOR" }))).toThrow();
    }
  });

  it("rejects unauthenticated requests on guarded routes", () => {
    expect(() => guard.canActivate(contextWith(undefined))).toThrow(UnauthorizedException);
  });

  it("is open when no @Roles metadata is present", () => {
    const open = makeGuard(undefined);
    expect(open.canActivate(contextWith(undefined))).toBe(true);
  });
});
