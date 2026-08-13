import { describe, it, expect } from "vitest";
import { PRODUCTS, productIdForMaterial, validateProductSize } from "./product";
import { materialSchema, type Material } from "./material";

describe("validateProductSize", () => {
  it("rejects Canvas 4'2\" × 4'2\" (50\" shorter side)", () => {
    const r = validateProductSize(PRODUCTS.CANVAS, {
      widthFt: 4,
      widthIn: 2,
      heightFt: 4,
      heightIn: 2,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toContain("49");
  });

  it("accepts Canvas 4'1\" × 10' (49\" shorter side)", () => {
    const r = validateProductSize(PRODUCTS.CANVAS, {
      widthFt: 4,
      widthIn: 1,
      heightFt: 10,
      heightIn: 0,
    });
    expect(r.ok).toBe(true);
  });

  it("rejects HDPE 4'5\" × 6' and accepts 4'4\" × 6'", () => {
    expect(
      validateProductSize(PRODUCTS.HDPE, { widthFt: 4, widthIn: 5, heightFt: 6, heightIn: 0 }).ok,
    ).toBe(false);
    expect(
      validateProductSize(PRODUCTS.HDPE, { widthFt: 4, widthIn: 4, heightFt: 6, heightIn: 0 }).ok,
    ).toBe(true);
  });

  it("rejects Poster 4'5\" × 6' and accepts 4'4\" × 6'", () => {
    expect(
      validateProductSize(PRODUCTS.POSTER, { widthFt: 4, widthIn: 5, heightFt: 6, heightIn: 0 }).ok,
    ).toBe(false);
    expect(
      validateProductSize(PRODUCTS.POSTER, { widthFt: 4, widthIn: 4, heightFt: 6, heightIn: 0 }).ok,
    ).toBe(true);
  });

  it("rejects No Curl 3×6 and accepts 2×6", () => {
    expect(
      validateProductSize(PRODUCTS.NO_CURL, { widthFt: 3, widthIn: 0, heightFt: 6, heightIn: 0 }).ok,
    ).toBe(false);
    expect(
      validateProductSize(PRODUCTS.NO_CURL, { widthFt: 2, widthIn: 0, heightFt: 6, heightIn: 0 }).ok,
    ).toBe(true);
  });

  it("rejects an 11\" axis as below the 12\" minimum", () => {
    const r = validateProductSize(PRODUCTS.NO_CURL, {
      widthFt: 0,
      widthIn: 11,
      heightFt: 1,
      heightIn: 0,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/12/);
  });

  it("rejects HD Banner 11×11 ft as over the billable cap", () => {
    const r = validateProductSize(PRODUCTS.HD_BANNER, {
      widthFt: 11,
      widthIn: 0,
      heightFt: 11,
      heightIn: 0,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/11' × 11'/);
  });
});

describe("productIdForMaterial", () => {
  it("round-trips all materials", () => {
    const expected: Record<Material, string> = {
      VINYL_13OZ_SINGLE: "HD_BANNER",
      VINYL_15OZ_SINGLE: "HD_BANNER",
      VINYL_18OZ_SINGLE: "HD_BANNER",
      VINYL_18OZ_DOUBLE: "HD_BANNER",
      RETRACTABLE: "RETRACTABLE",
      HDPE: "HDPE",
      CANVAS_11OZ: "CANVAS",
      MESH_8OZ: "MESH",
      POSTER_8MIL: "POSTER",
      NO_CURL_8MIL: "NO_CURL",
      ECONOSTAND: "ECONOSTAND",
    };
    for (const m of materialSchema.options) {
      expect(productIdForMaterial(m)).toBe(expected[m]);
    }
  });
});
