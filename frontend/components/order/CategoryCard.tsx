import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PlaceholderImage } from "@/components/ui/PlaceholderImage";
import { placeholders, type PlaceholderKey } from "@/content/placeholders";
import type { BannerCatalogCard } from "@bannersin48/api-client";
import type { ProductId } from "@bannersin48/shared";

const PRODUCT_IMAGE: Record<ProductId, PlaceholderKey> = {
  HD_BANNER: "hero",
  HDPE: "catalogHdpe",
  CANVAS: "catalogCanvas",
  MESH: "catalogMesh",
  POSTER: "catalogPoster",
  NO_CURL: "catalogNoCurl",
  ECONOSTAND: "catalogEconostand",
  RETRACTABLE: "catalogEconostand",
};

function imageFor(card: BannerCatalogCard) {
  const key = PRODUCT_IMAGE[card.id as ProductId] ?? "hero";
  return placeholders[key];
}

export function CategoryCard({
  card,
  onMoreInfo,
}: {
  card: BannerCatalogCard;
  onMoreInfo: (slug: string) => void;
}) {
  const image = imageFor(card);

  return (
    <article
      data-testid={`hub-card-${card.slug}`}
      className="group relative overflow-hidden rounded-card border border-line bg-surface shadow-elev-1 transition-all hover:border-strong-accent hover:shadow-elev-2 motion-safe:hover:-translate-y-1"
    >
      <Link
        href={card.route}
        data-testid={`hub-order-${card.slug}`}
        className="absolute inset-0 z-[1] no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-strong-accent focus-visible:ring-offset-2"
        aria-label={`Order ${card.title}`}
      />
      <div className="relative aspect-video overflow-hidden">
        <PlaceholderImage
          src={image.src}
          alt=""
          fill
          rounded="none"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="transition-transform duration-500 ease-out motion-safe:group-hover:scale-[1.08]"
        />
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-darkest/85 via-darkest/35 to-transparent transition-colors duration-500 group-hover:from-darkest/95"
          aria-hidden
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 p-lg">
          <h2 className="font-display tracking-tight text-[clamp(22px,2.5vw,34px)] leading-[1.05] text-white uppercase drop-shadow-sm">
            {card.title}
          </h2>
          <p className="mt-xs text-sm text-white/85 font-body leading-relaxed">{card.subtitle}</p>
          <span className="mt-md inline-flex items-center gap-xs text-sm font-semibold text-strong-accent font-body">
            Order
            <ArrowRight
              className="h-4 w-4 transition-transform duration-300 motion-safe:group-hover:translate-x-1"
              aria-hidden
            />
          </span>
        </div>
      </div>
      {card.hasMoreInfo && (
        <button
          type="button"
          data-testid={`hub-more-info-${card.slug}`}
          onClick={() => onMoreInfo(card.slug)}
          className="absolute top-md right-md z-[2] rounded-btn border border-white/70 bg-darkest/55 px-md py-xs text-sm font-semibold text-white font-body backdrop-blur-sm hover:bg-darkest/80"
        >
          More info
        </button>
      )}
    </article>
  );
}
