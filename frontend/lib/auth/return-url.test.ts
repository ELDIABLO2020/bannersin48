import { describe, expect, it } from "vitest";
import { safeReturnUrl } from "./return-url";

describe("safeReturnUrl", () => {
  it("preserves same-origin paths and query state", () => {
    expect(safeReturnUrl("/order/hd-banner?artwork=1")).toBe("/order/hd-banner?artwork=1");
    expect(safeReturnUrl("/checkout")).toBe("/checkout");
  });

  it.each(["https://evil.example", "//evil.example/path", "\\\\evil.example"])(
    "rejects external return target %s",
    (target) => expect(safeReturnUrl(target)).toBe("/dashboard"),
  );
});
