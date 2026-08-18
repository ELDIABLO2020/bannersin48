import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { VisualCategoryCard } from "@/components/catalog/VisualCategoryCard";
import { catalogImage } from "@/content/catalogImages";
import { PRODUCTS, productOrderHref, type ProductId } from "@bannersin48/shared";

const FAMILIES: ReadonlyArray<{
  id: ProductId;
  points: readonly string[];
}> = [
  {
    id: "HD_BANNER",
    points: ["13, 15, or 18 oz vinyl", "Indoor and outdoor", "Double-sided on 18 oz"],
  },
  {
    id: "MESH",
    points: ["Lets wind pass through", "Fences and jobsites", "Webbing reinforcement"],
  },
  {
    id: "HDPE",
    points: ["Water- and tear-resistant", "Lightweight", "Short-term indoor or outdoor"],
  },
  {
    id: "POSTER",
    points: ["Satin paper", "Indoor POP", "Short-term events"],
  },
  {
    id: "NO_CURL",
    points: ["Lays flat and stays flat", "Indoor or outdoor", 'Shorter side up to 35"'],
  },
  {
    id: "CANVAS",
    points: ["Poly-cotton canvas", "Stretch and frame", "Indoor displays"],
  },
  {
    id: "ECONOSTAND",
    points: ['Fixed 33.5" × 80"', "Stand included", "Indoor floors"],
  },
  {
    id: "RETRACTABLE",
    points: ["Stand, graphic, and case", "Trade shows and retail", "Portable"],
  },
];

export function MaterialsBand() {
  return (
    <section
      className="bg-[linear-gradient(180deg,var(--color-bg-lightest)_0%,var(--color-bg-soft-accent)_100%)]"
      aria-labelledby="materials-h"
    >
      <div className="mx-auto max-w-content px-md lg:px-2xl py-3xl">
        <ScrollReveal className="mb-2xl text-center">
          <p className="text-strong-accent font-semibold text-sm mb-md font-body">Products</p>
          <h2
            id="materials-h"
            className="font-display tracking-tight text-[clamp(34px,4.5vw,68px)] leading-[1.05] text-ink uppercase"
          >
            Choose the right product
          </h2>
          <p className="text-body text-ink-muted mt-md mx-auto max-w-2xl font-body">
            HD vinyl for everyday installs, mesh for wind, paper and canvas for indoor work, and
            stands when you need hardware.
          </p>
          <Link
            href="/sizes"
            className="mt-md inline-flex items-center gap-xs text-sm font-semibold text-link no-underline hover:underline font-body"
          >
            Compare products and pricing
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </ScrollReveal>

        <ScrollReveal className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-lg">
          {FAMILIES.map((family) => {
            const product = PRODUCTS[family.id];
            return (
              <VisualCategoryCard
                key={family.id}
                href={productOrderHref(family.id)}
                title={product.title}
                subtitle={product.subtitle}
                image={catalogImage(family.id)}
                sizes="(max-width: 768px) 100vw, 25vw"
                footer={
                  <ul className="space-y-xs text-sm text-ink font-body">
                    {family.points.map((point) => (
                      <li key={point} className="flex items-center gap-xs">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden />
                        {point}
                      </li>
                    ))}
                  </ul>
                }
              />
            );
          })}
        </ScrollReveal>
      </div>
    </section>
  );
}
