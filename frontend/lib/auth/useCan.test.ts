import { describe, expect, it } from "vitest";
import { canWith, hasAdminAccess } from "./useCan";

describe("canWith", () => {
  it.each([
    [["*"], "payments:mark_paid", "all", true],
    [["orders:read"], "orders:read", "all", true],
    [["orders:read"], "payments:mark_paid", "all", false],
    [["orders:read", "orders:hold"], ["orders:read", "orders:hold"], "all", true],
    [["orders:read"], ["orders:read", "orders:hold"], "all", false],
    [["orders:read"], ["orders:read", "orders:hold"], "any", true],
    [["content:read"], ["orders:read", "orders:hold"], "any", false],
    [[], "orders:read", "all", false],
    [undefined, "orders:read", "all", false],
    [null, "orders:read", "any", false],
  ] as const)("%j can %j (%s) → %s", (effective, perm, mode, expected) => {
    expect(canWith(effective as readonly string[] | null | undefined, perm as never, mode)).toBe(expected);
  });

  it("treats an empty requirement as satisfied", () => {
    expect(canWith([], [], "all")).toBe(true);
  });
});

describe("hasAdminAccess", () => {
  it("admits anyone holding at least one permission and nobody else", () => {
    expect(hasAdminAccess({ permissions: ["*"] })).toBe(true);
    expect(hasAdminAccess({ permissions: ["content:read"] })).toBe(true);
    expect(hasAdminAccess({ permissions: [] })).toBe(false);
    expect(hasAdminAccess(null)).toBe(false);
    expect(hasAdminAccess(undefined)).toBe(false);
  });
});
