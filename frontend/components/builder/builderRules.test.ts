import { describe, it, expect } from "vitest";
import {
  getControlEligibility,
  materialForPrintSides,
  canSelectDoubleSided,
  isDoubleSided,
} from "./builderRules";
import { DEFAULT_FINISHING } from "@bannersin48/shared";

const size4x8 = { widthFt: 4, widthIn: 0, heightFt: 8, heightIn: 0 };
const size2x4 = { widthFt: 2, widthIn: 0, heightFt: 4, heightIn: 0 };

describe("builderRules", () => {
  it("disables DOUBLE on 13/15 oz", () => {
    expect(
      getControlEligibility("sides", {
        material: "VINYL_13OZ_SINGLE",
        size: size4x8,
        finishing: DEFAULT_FINISHING,
      }).enabled,
    ).toBe(false);
    expect(canSelectDoubleSided("VINYL_13OZ_SINGLE")).toBe(false);
    expect(canSelectDoubleSided("VINYL_18OZ_SINGLE")).toBe(true);
  });

  it("maps print sides to 18oz double material", () => {
    expect(materialForPrintSides("VINYL_18OZ_SINGLE", true)).toBe("VINYL_18OZ_DOUBLE");
    expect(materialForPrintSides("VINYL_18OZ_DOUBLE", false)).toBe("VINYL_18OZ_SINGLE");
    expect(isDoubleSided("VINYL_18OZ_DOUBLE")).toBe(true);
  });

  it("gates wind slits by size band", () => {
    expect(
      getControlEligibility("wind", {
        material: "VINYL_13OZ_SINGLE",
        size: size4x8,
        finishing: DEFAULT_FINISHING,
      }).enabled,
    ).toBe(true);
    expect(
      getControlEligibility("wind", {
        material: "VINYL_13OZ_SINGLE",
        size: size2x4,
        finishing: DEFAULT_FINISHING,
      }).enabled,
    ).toBe(false);
  });

  it("keeps rope and grommets tiles enabled so finishing patch can clear conflicts", () => {
    const withRope = {
      ...DEFAULT_FINISHING,
      grommets: false,
      rope: true,
      ropePlacement: "TOP" as const,
    };
    expect(
      getControlEligibility("grommets", {
        material: "VINYL_13OZ_SINGLE",
        size: size4x8,
        finishing: withRope,
      }).enabled,
    ).toBe(true);
    expect(
      getControlEligibility("rope", {
        material: "VINYL_13OZ_SINGLE",
        size: size4x8,
        finishing: DEFAULT_FINISHING,
      }).enabled,
    ).toBe(true);
  });

  it("still disables grommets when pole pockets are on", () => {
    expect(
      getControlEligibility("grommets", {
        material: "VINYL_13OZ_SINGLE",
        size: size4x8,
        finishing: {
          ...DEFAULT_FINISHING,
          welding: false,
          grommets: false,
          polePockets: true,
          polePocketPlacement: "TOP",
          polePocketDepthIn: 2,
        },
      }).enabled,
    ).toBe(false);
  });

  it("disables welding when pole pockets on", () => {
    expect(
      getControlEligibility("welding", {
        material: "VINYL_13OZ_SINGLE",
        size: size4x8,
        finishing: {
          ...DEFAULT_FINISHING,
          welding: false,
          grommets: false,
          polePockets: true,
          polePocketPlacement: "TOP",
          polePocketDepthIn: 2,
        },
      }).enabled,
    ).toBe(false);
  });
});
