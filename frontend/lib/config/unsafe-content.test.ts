import { describe, expect, it } from "vitest";
import { findUnsafeCustomerContent } from "./unsafe-content";

describe("unsafe customer content validation", () => {
  it.each([
    "Payments are stubbed in this build.",
    "This uses a mock backend.",
    "Available in Phase 2.",
    "Demo account: buyer@example.com",
    "Placeholder proof",
    "Real feedback from verified customers.",
  ])("rejects unsafe copy: %s", (copy) => {
    expect(findUnsafeCustomerContent(copy)).not.toEqual([]);
  });

  it("allows truthful internal manual-payment copy", () => {
    expect(
      findUnsafeCustomerContent(
        "Internal platform test. Submit the order, then staff will confirm manual payment.",
      ),
    ).toEqual([]);
  });
});
