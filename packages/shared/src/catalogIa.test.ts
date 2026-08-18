import { describe, it, expect } from "vitest";
import {
  catalogFilterHref,
  catalogFilterProductIds,
  catalogFilterLabel,
  productOrderHref,
  CATALOG_NAV_PRODUCTS,
  CATALOG_STAND_IDS,
} from "./catalogIa";

describe("catalog IA", () => {
  it("lists all eight shoppable products", () => {
    expect(CATALOG_NAV_PRODUCTS).toEqual([
      "HD_BANNER",
      "HDPE",
      "CANVAS",
      "MESH",
      "POSTER",
      "NO_CURL",
      "ECONOSTAND",
      "RETRACTABLE",
    ]);
  });

  it("routes contractor need to mesh and HD Banner", () => {
    expect(catalogFilterHref("contractor")).toBe("/order?need=contractor");
    expect(catalogFilterProductIds("contractor")).toEqual(["MESH", "HD_BANNER"]);
    expect(catalogFilterLabel("contractor")).toBe("Contractor");
  });

  it("routes windy need to mesh first", () => {
    expect(catalogFilterProductIds("windy")?.[0]).toBe("MESH");
  });

  it("groups stands separately from hanging banners", () => {
    expect(CATALOG_STAND_IDS).toEqual(["ECONOSTAND", "RETRACTABLE"]);
  });

  it("builds product order hrefs from slugs", () => {
    expect(productOrderHref("MESH")).toBe("/order/mesh");
    expect(productOrderHref("HD_BANNER", "w=4&h=8")).toBe("/order/hd-banner?w=4&h=8");
  });

  it("returns null for unknown filters", () => {
    expect(catalogFilterProductIds("not-a-filter")).toBeNull();
    expect(catalogFilterLabel(undefined)).toBeNull();
  });
});
