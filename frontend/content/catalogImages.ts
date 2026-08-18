import type { CatalogUseCaseId, ProductId } from "@bannersin48/shared";
import { placeholders, type PlaceholderAsset, type PlaceholderKey } from "./placeholders";

export const PRODUCT_PLACEHOLDER: Record<ProductId, PlaceholderKey> = {
  HD_BANNER: "hero",
  HDPE: "catalogHdpe",
  CANVAS: "catalogCanvas",
  MESH: "catalogMesh",
  POSTER: "catalogPoster",
  NO_CURL: "catalogNoCurl",
  ECONOSTAND: "catalogEconostand",
  RETRACTABLE: "catalogEconostand",
};

export const USE_CASE_PLACEHOLDER: Record<CatalogUseCaseId, PlaceholderKey> = {
  contractor: "industryContractor",
  restaurant: "industryRestaurant",
  school: "industrySchool",
  events: "industryEvents",
  business: "industryBusiness",
  "real-estate": "industryRealEstate",
};

export function catalogImage(id: ProductId): PlaceholderAsset {
  return placeholders[PRODUCT_PLACEHOLDER[id]];
}

export function imageForUseCase(id: CatalogUseCaseId): PlaceholderAsset {
  return placeholders[USE_CASE_PLACEHOLDER[id]];
}
