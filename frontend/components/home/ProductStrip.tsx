import Link from "next/link";
import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { VisualCategoryCard } from "@/components/catalog/VisualCategoryCard";
import { catalogImage } from "@/content/catalogImages";
import { SectionHeading } from "@/components/ui/section-heading";
import {
  PRODUCTS,
  CATALOG_NAV_PRODUCTS,
  CATALOG_NEEDS,
  catalogFilterHref,
  productOrderHref,
  type ProductId,
} from "@bannersin48/shared";

/** Four featured products on the homepage; the full catalog lives on /order. */
const FEATURED: ReadonlyArray<ProductId> = ["HD_BANNER", "MESH", "POSTER", "RETRACTABLE"];

export function ProductStrip() {
  const featured = CATALOG_NAV_PRODUCTS.filter((id) =>
    (FEATURED as readonly string[]).includes(id),
  );
  return (
    <section id="products" className="bg-surface" aria-labelledby="products-h">
      <div className="mx-auto max-w-content px-md lg:px-2xl py-3xl">
        <div className="mb-lg flex flex-col gap-md md:flex-row md:items-end md:justify-between">
          <SectionHeading
            id="products-h"
            title="Every banner we print"
            intro="Vinyl, mesh, paper, canvas, and stands. Start from the product, or from where it will hang."
          />
          <Link href="/order" className="text-body-sm font-bold text-link font-body shrink-0">
            See all 8 products
          </Link>
        </div>
        <ul className="mb-xl flex flex-wrap gap-xs" aria-label="Choose by need">
          {CATALOG_NEEDS.map((need) => (
            <li key={need.id}>
              <Link
                href={catalogFilterHref(need.id)}
                className="inline-flex min-h-11 items-center rounded-pill border border-line bg-surface px-md text-body-sm font-semibold text-ink no-underline transition-colors hover:border-link hover:text-link"
              >
                {need.label}
              </Link>
            </li>
          ))}
        </ul>
        <ScrollReveal className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-md">
          {featured.map((id) => {
            const product = PRODUCTS[id];
            return (
              <VisualCategoryCard
                key={id}
                href={productOrderHref(id)}
                title={product.title}
                subtitle={product.subtitle}
                image={catalogImage(id)}
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              />
            );
          })}
        </ScrollReveal>
      </div>
    </section>
  );
}
