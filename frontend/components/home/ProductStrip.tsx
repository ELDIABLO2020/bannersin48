import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { VisualCategoryCard } from "@/components/catalog/VisualCategoryCard";
import { catalogImage } from "@/content/catalogImages";
import { PRODUCTS, CATALOG_NAV_PRODUCTS, productOrderHref, type ProductId } from "@bannersin48/shared";

/** Four featured products on the homepage; the full catalog lives on /order. */
const FEATURED: ReadonlyArray<ProductId> = ["HD_BANNER", "MESH", "POSTER", "RETRACTABLE"];

export function ProductStrip() {
  const featured = CATALOG_NAV_PRODUCTS.filter((id) =>
    (FEATURED as readonly string[]).includes(id),
  );
  return (
    <section id="products" className="bg-surface border-b border-line" aria-labelledby="products-h">
      <div className="mx-auto max-w-content px-md lg:px-2xl py-3xl">
        <ScrollReveal className="mb-xl flex flex-col gap-md md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-strong-accent font-semibold text-sm mb-md font-body">Catalog</p>
            <h2
              id="products-h"
              className="font-display tracking-tight text-[clamp(34px,4.5vw,52px)] leading-[1.05] text-ink uppercase"
            >
              Every banner we print
            </h2>
            <p className="text-body text-ink-muted mt-md max-w-2xl font-body">
              Vinyl, mesh, paper, canvas, and stands — pick the product that matches the job.
            </p>
          </div>
          <Link
            href="/order"
            className="inline-flex items-center gap-xs text-sm font-semibold text-link no-underline hover:underline font-body"
          >
            View all products
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </ScrollReveal>
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
