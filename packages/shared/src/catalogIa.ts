import { PRODUCTS, type ProductId } from "./product";

export const CATALOG_NAV_PRODUCTS: ReadonlyArray<ProductId> = [
  "HD_BANNER",
  "HDPE",
  "CANVAS",
  "MESH",
  "POSTER",
  "NO_CURL",
  "ECONOSTAND",
  "RETRACTABLE",
];

export const CATALOG_BANNER_IDS: ReadonlyArray<ProductId> = [
  "HD_BANNER",
  "HDPE",
  "MESH",
  "POSTER",
  "NO_CURL",
  "CANVAS",
];

export const CATALOG_STAND_IDS: ReadonlyArray<ProductId> = ["ECONOSTAND", "RETRACTABLE"];

export type CatalogNeedId = "indoor" | "outdoor" | "windy" | "lay-flat" | "art" | "stand";

export const CATALOG_NEEDS: ReadonlyArray<{
  id: CatalogNeedId;
  label: string;
  productIds: ReadonlyArray<ProductId>;
}> = [
  {
    id: "indoor",
    label: "Indoor",
    productIds: ["HD_BANNER", "POSTER", "NO_CURL", "CANVAS", "ECONOSTAND", "RETRACTABLE"],
  },
  { id: "outdoor", label: "Outdoor", productIds: ["HD_BANNER", "HDPE", "MESH", "NO_CURL"] },
  { id: "windy", label: "Windy", productIds: ["MESH", "HD_BANNER"] },
  { id: "lay-flat", label: "Lay-flat", productIds: ["NO_CURL", "POSTER"] },
  { id: "art", label: "Art / frame", productIds: ["CANVAS"] },
  { id: "stand", label: "With stand", productIds: ["ECONOSTAND", "RETRACTABLE"] },
];

export type CatalogUseCaseId =
  | "business"
  | "restaurant"
  | "contractor"
  | "school"
  | "events"
  | "real-estate";

export const CATALOG_USE_CASES: ReadonlyArray<{
  id: CatalogUseCaseId;
  label: string;
  productIds: ReadonlyArray<ProductId>;
}> = [
  { id: "business", label: "Business", productIds: ["HD_BANNER", "POSTER", "RETRACTABLE"] },
  { id: "restaurant", label: "Restaurant", productIds: ["HD_BANNER", "POSTER"] },
  { id: "contractor", label: "Contractor", productIds: ["MESH", "HD_BANNER"] },
  { id: "school", label: "School & Sports", productIds: ["HD_BANNER", "POSTER", "MESH"] },
  { id: "events", label: "Events", productIds: ["HD_BANNER", "MESH", "POSTER"] },
  { id: "real-estate", label: "Real Estate", productIds: ["HD_BANNER", "HDPE", "POSTER"] },
];

export const CATALOG_MARQUEE: ReadonlyArray<{ label: string; filterId: CatalogUseCaseId }> = [
  { label: "Contractors", filterId: "contractor" },
  { label: "Restaurants", filterId: "restaurant" },
  { label: "Schools", filterId: "school" },
  { label: "Real Estate", filterId: "real-estate" },
  { label: "Events", filterId: "events" },
  { label: "Retail", filterId: "business" },
  { label: "Sports Teams", filterId: "school" },
  { label: "Grand Openings", filterId: "business" },
];

export type CatalogFilterId = CatalogNeedId | CatalogUseCaseId;

export const CATALOG_COMPARISONS: ReadonlyArray<{
  title: string;
  items: ReadonlyArray<{ productId: ProductId; note: string }>;
}> = [
  {
    title: "Outdoor hanging banners",
    items: [
      { productId: "HD_BANNER", note: "Durable vinyl with finishing options" },
      { productId: "MESH", note: "Wind passes through — fences and jobsites" },
      { productId: "HDPE", note: "Lightweight, water- and tear-resistant" },
    ],
  },
  {
    title: "Indoor paper and flat prints",
    items: [
      { productId: "POSTER", note: "Short-term indoor POP" },
      { productId: "NO_CURL", note: "Lays flat, indoor or outdoor" },
    ],
  },
  {
    title: "Banner stands",
    items: [
      { productId: "ECONOSTAND", note: "All-in-one stand" },
      { productId: "RETRACTABLE", note: "Stand, graphic, and carrying case" },
    ],
  },
];

export function catalogFilterHref(id: CatalogFilterId): string {
  return `/order?need=${id}`;
}

export function catalogFilterProductIds(id: string | null | undefined): ProductId[] | null {
  if (!id) return null;
  const need = CATALOG_NEEDS.find((n) => n.id === id);
  if (need) return [...need.productIds];
  const use = CATALOG_USE_CASES.find((u) => u.id === id);
  if (use) return [...use.productIds];
  return null;
}

export function catalogFilterLabel(id: string | null | undefined): string | null {
  if (!id) return null;
  const need = CATALOG_NEEDS.find((n) => n.id === id);
  if (need) return need.label;
  const use = CATALOG_USE_CASES.find((u) => u.id === id);
  if (use) return use.label;
  return null;
}

export function productOrderHref(id: ProductId, query?: string): string {
  const base = `/order/${PRODUCTS[id].slug}`;
  return query ? `${base}?${query}` : base;
}

export function isStandProduct(id: ProductId): boolean {
  return id === "ECONOSTAND" || id === "RETRACTABLE";
}
