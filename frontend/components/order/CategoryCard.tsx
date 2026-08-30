import { catalogImage } from "@/content/catalogImages";
import { VisualCategoryCard } from "@/components/catalog/VisualCategoryCard";
import { PRODUCTS, productOrderHref, type ProductId } from "@bannersin48/shared";

export function CategoryCard({
  productId,
  onMoreInfo,
}: {
  productId: ProductId;
  onMoreInfo: (slug: string) => void;
}) {
  const product = PRODUCTS[productId];
  return (
    <VisualCategoryCard
      href={productOrderHref(productId)}
      title={product.title}
      subtitle={product.subtitle}
      image={catalogImage(productId)}
      headingLevel="h2"
      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
      mediaClassName="aspect-[4/3]"
      testId={`hub-card-${product.slug}`}
      linkTestId={`hub-order-${product.slug}`}
      ariaLabel={`Order ${product.title}`}
      overlayAction={
        product.hasMoreInfo ? (
          <button
            type="button"
            data-testid={`hub-more-info-${product.slug}`}
            onClick={() => onMoreInfo(product.slug)}
            className="rounded-btn border border-white/70 bg-darkest/55 px-md py-xs text-sm font-semibold text-white font-body backdrop-blur-sm hover:bg-darkest/80"
          >
            More info
          </button>
        ) : undefined
      }
    />
  );
}
