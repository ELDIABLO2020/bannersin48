import type { ProductId } from "@bannersin48/shared";
import { placeholders, type PlaceholderAsset, type PlaceholderKey } from "./placeholders";

const PRODUCT_PLACEHOLDER: Record<ProductId, PlaceholderKey> = {
  HD_BANNER: "hero",
  HDPE: "catalogHdpe",
  CANVAS: "catalogCanvas",
  MESH: "catalogMesh",
  POSTER: "catalogPoster",
  NO_CURL: "catalogNoCurl",
  ECONOSTAND: "catalogEconostand",
  RETRACTABLE: "catalogEconostand",
};

export function catalogImage(id: ProductId): PlaceholderAsset {
  return placeholders[PRODUCT_PLACEHOLDER[id]];
}
