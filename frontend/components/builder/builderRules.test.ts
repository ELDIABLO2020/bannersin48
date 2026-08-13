import { describe, it, expect } from "vitest";
import {
  getControlEligibility,
  materialForPrintSides,
  canSelectDoubleSided,
  isDoubleSided,
  visibleTiles,
} from "./builderRules";
import { popularSizesForProduct } from "./SizePanel";
import { DEFAULT_FINISHING } from "@bannersin48/shared";

const size4x8 = { widthFt: 4, widthIn: 0, heightFt: 8, heightIn: 0 };
const size2x4 = { widthFt: 2, widthIn: 0, heightFt: 4, heightIn: 0 };
const hd = { productId: "HD_BANNER" as const };

describe("builderRules", () => {
  it("disables DOUBLE on 13/15 oz", () => {
    expect(
      getControlEligibility("sides", {
        ...hd,
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
        ...hd,
        material: "VINYL_13OZ_SINGLE",
        size: size4x8,
        finishing: DEFAULT_FINISHING,
      }).enabled,
    ).toBe(true);
    expect(
      getControlEligibility("wind", {
        ...hd,
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
        ...hd,
        material: "VINYL_13OZ_SINGLE",
        size: size4x8,
        finishing: withRope,
      }).enabled,
    ).toBe(true);
    expect(
      getControlEligibility("rope", {
        ...hd,
        material: "VINYL_13OZ_SINGLE",
        size: size4x8,
        finishing: DEFAULT_FINISHING,
      }).enabled,
    ).toBe(true);
  });

  it("still disables grommets when pole pockets are on", () => {
    expect(
      getControlEligibility("grommets", {
        ...hd,
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
        ...hd,
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

  it("visibleTiles for poster is images + size", () => {
    expect(visibleTiles("POSTER")).toEqual(["images", "size"]);
  });

  it("visibleTiles for mesh includes webbing and excludes wind/material/sides", () => {
    const tiles = visibleTiles("MESH");
    expect(tiles).toContain("webbing");
    expect(tiles).not.toContain("wind");
    expect(tiles).not.toContain("material");
    expect(tiles).not.toContain("sides");
  });

  it("visibleTiles for econostand is images only", () => {
    expect(visibleTiles("ECONOSTAND")).toEqual(["images"]);
  });

  it("enables webbing on mesh", () => {
    expect(
      getControlEligibility("webbing", {
        productId: "MESH",
        material: "MESH_8OZ",
        size: size4x8,
        finishing: DEFAULT_FINISHING,
      }).enabled,
    ).toBe(true);
  });

  it("filters popular sizes by product caps", () => {
    const noCurl = popularSizesForProduct("NO_CURL").map((s) => s.id);
    expect(noCurl).toEqual(["2x4", "2x6", "2x8"]);
    expect(popularSizesForProduct("POSTER").some((s) => s.id === "4x8")).toBe(true);
    expect(popularSizesForProduct("POSTER").some((s) => s.id === "5x8")).toBe(false);
    expect(popularSizesForProduct("CANVAS").some((s) => s.id === "10x10")).toBe(false);
    expect(popularSizesForProduct("HDPE").some((s) => s.id === "4x6")).toBe(true);
  });
});
