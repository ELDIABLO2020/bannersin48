import { AuditService } from "./audit.service";

describe("AuditService.diffOf", () => {
  it("produces old→new entries for changed fields only", () => {
    const diff = AuditService.diffOf(
      { ratePerSqft: "4.75", name: "15 oz Vinyl", active: true, createdAt: new Date(0) },
      { ratePerSqft: "5.25", name: "15 oz Vinyl", active: false, createdAt: new Date(0) },
    );
    expect(diff).toEqual({
      ratePerSqft: { from: "4.75", to: "5.25" },
      active: { from: true, to: false },
    });
  });

  it("handles added/removed fields and nulls", () => {
    const diff = AuditService.diffOf(null, { name: "New" });
    expect(diff.name).toEqual({ from: null, to: "New" });
    const diff2 = AuditService.diffOf({ name: "Old" }, {});
    expect(diff2.name).toEqual({ from: "Old", to: null });
  });

  it("compares objects structurally", () => {
    const diff = AuditService.diffOf({ rates: { a: 1 } }, { rates: { a: 1 } });
    expect(diff).toEqual({});
    const diff2 = AuditService.diffOf({ rates: { a: 1 } }, { rates: { a: 2 } });
    expect(diff2.rates).toEqual({ from: { a: 1 }, to: { a: 2 } });
  });
});
