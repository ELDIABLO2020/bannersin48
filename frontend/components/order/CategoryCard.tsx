import { catalogImage } from "@/content/catalogImages";
import { VisualCategoryCard } from "@/components/catalog/VisualCategoryCard";
import type { BannerCatalogCard } from "@bannersin48/api-client";
import type { ProductId } from "@bannersin48/shared";

export function CategoryCard({
  card,
  onMoreInfo,
}: {
  card: BannerCatalogCard;
  onMoreInfo: (slug: string) => void;
}) {
  return (
    <VisualCategoryCard
      href={card.route}
      title={card.title}
      subtitle={card.subtitle}
      image={catalogImage(card.id as ProductId)}
      headingLevel="h2"
      testId={`hub-card-${card.slug}`}
      linkTestId={`hub-order-${card.slug}`}
      ariaLabel={`Order ${card.title}`}
      overlayAction={
        card.hasMoreInfo ? (
          <button
            type="button"
            data-testid={`hub-more-info-${card.slug}`}
            onClick={() => onMoreInfo(card.slug)}
            className="rounded-btn border border-white/70 bg-darkest/55 px-md py-xs text-sm font-semibold text-white font-body backdrop-blur-sm hover:bg-darkest/80"
          >
            More info
          </button>
        ) : undefined
      }
    />
  );
}
