import { describe, it, expect } from "vitest";
import {
  formatFeetInches,
  formatAxis,
  formatDimensionsWH,
  formatDimensionsHW,
  formatBillableWH,
  formatInchesWH,
  orientationOf,
  orientationOfInches,
  orientationLabel,
  resolveSizeParams,
  dimensionsDisplay,
  billableDimensions,
} from "./dimensions";

describe("formatFeetInches / formatAxis", () => {
  it("formats whole feet without inches", () => {
    expect(formatFeetInches(8, 0)).toBe("8′");
  });

  it("formats feet and inches", () => {
    expect(formatFeetInches(4, 6)).toBe("4′ 6″");
  });

  it("adds axis labels", () => {
    expect(formatAxis("W", 8, 0)).toBe("8′ W");
    expect(formatAxis("H", 4, 6)).toBe("4′ 6″ H");
  });
});

describe("axis-label dimension formatters", () => {
  const fourByEight: Parameters<typeof formatDimensionsWH>[0] = {
    widthFt: 8,
    widthIn: 0,
    heightFt: 4,
    heightIn: 0,
  };

  it('renders "8′ W × 4′ H" in canonical width × height order', () => {
    expect(formatDimensionsWH(fourByEight)).toBe("8′ W × 4′ H");
  });

  it('renders "4′ H × 8′ W" in industry-facing height × width order', () => {
    expect(formatDimensionsHW(fourByEight)).toBe("4′ H × 8′ W");
  });

  it("handles fractional inches on both axes", () => {
    const d = { widthFt: 5, widthIn: 6, heightFt: 7, heightIn: 2 };
    expect(formatDimensionsWH(d)).toBe("5′ 6″ W × 7′ 2″ H");
  });

  it("formats billable whole-foot dims with axis labels", () => {
    expect(formatBillableWH({ widthFt: 8, heightFt: 4 })).toBe("8′ W × 4′ H");
  });

  it("formats fixed-inch stand sizes", () => {
    expect(formatInchesWH(33.5, 80)).toBe("33.5″ W × 80″ H");
  });
});

describe("orientation", () => {
  it("classifies landscape, portrait, and square", () => {
    expect(orientationOfInches(96, 48)).toBe("landscape");
    expect(orientationOfInches(48, 96)).toBe("portrait");
    expect(orientationOfInches(48, 48)).toBe("square");
  });

  it("classifies a Dimensions value including fractional inches", () => {
    expect(orientationOf({ widthFt: 8, widthIn: 0, heightFt: 4, heightIn: 0 })).toBe("landscape");
    expect(orientationOf({ widthFt: 1, widthIn: 0, heightFt: 2, heightIn: 0 })).toBe("portrait");
    expect(orientationOf({ widthFt: 10, widthIn: 0, heightFt: 10, heightIn: 0 })).toBe("square");
  });

  it("returns human-readable orientation labels", () => {
    expect(orientationLabel("landscape")).toBe("Landscape");
    expect(orientationLabel("portrait")).toBe("Portrait");
    expect(orientationLabel("square")).toBe("Square");
  });
});

describe("resolveSizeParams (legacy-URL redirect)", () => {
  it("resolves canonical width/height parameters", () => {
    expect(resolveSizeParams({ width: "8", height: "4" })).toEqual({
      widthFt: 8,
      heightFt: 4,
      legacy: false,
    });
  });

  it("prefers canonical width/height over legacy w/h", () => {
    expect(
      resolveSizeParams({ width: "8", height: "4", w: "3", h: "6" }),
    ).toEqual({ widthFt: 8, heightFt: 4, legacy: false });
  });

  it("swaps legacy w/h axes so a legacy 4×8 link resolves to landscape 8×4", () => {
    expect(resolveSizeParams({ w: "4", h: "8" })).toEqual({
      widthFt: 8,
      heightFt: 4,
      legacy: true,
    });
  });

  it("returns null for missing or non-numeric parameters", () => {
    expect(resolveSizeParams({})).toBeNull();
    expect(resolveSizeParams({ w: "4" })).toBeNull();
    expect(resolveSizeParams({ width: "x", height: "4" })).toBeNull();
    expect(resolveSizeParams({ w: "bad", h: "8" })).toBeNull();
  });
});

describe("dimensionsDisplay + billableDimensions", () => {
  it("labels requested and billable dims with axes", () => {
    const d = dimensionsDisplay({ widthFt: 4, widthIn: 6, heightFt: 8, heightIn: 0 });
    expect(d.requestedLabel).toBe("4′ 6″ W × 8′ H");
    expect(d.billable).toEqual({ widthFt: 5, heightFt: 8, sqFt: 40 });
    expect(d.billableLabel).toBe("5′ W × 8′ H");
    expect(d.eligible).toBe(true);
  });

  it("rounds each axis up independently", () => {
    expect(billableDimensions({ widthFt: 5, widthIn: 6, heightFt: 7, heightIn: 2 })).toEqual({
      widthFt: 6,
      heightFt: 8,
      sqFt: 48,
    });
  });
});
