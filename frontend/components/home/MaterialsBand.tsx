import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { PlaceholderImage } from "@/components/ui/PlaceholderImage";
import { placeholders, type PlaceholderKey } from "@/content/placeholders";
import { PRODUCTS, productOrderHref, type ProductId } from "@bannersin48/shared";

const FAMILIES: ReadonlyArray<{
  id: ProductId;
  imageKey: PlaceholderKey;
  points: readonly string[];
}> = [
  {
    id: "HD_BANNER",
    imageKey: "material13oz",
    points: ["13, 15, or 18 oz vinyl", "Indoor and outdoor", "Double-sided on 18 oz"],
  },
  {
    id: "MESH",
    imageKey: "industryContractor",
    points: ["Lets wind pass through", "Fences and jobsites", "Webbing reinforcement"],
  },
  {
    id: "HDPE",
    imageKey: "material15oz",
    points: ["Water- and tear-resistant", "Lightweight", "Short-term indoor or outdoor"],
  },
  {
    id: "POSTER",
    imageKey: "industryBusiness",
    points: ["Satin paper", "Indoor POP", "Short-term events"],
  },
  {
    id: "NO_CURL",
    imageKey: "industryEvents",
    points: ["Lays flat and stays flat", "Indoor or outdoor", 'Shorter side up to 35"'],
  },
  {
    id: "CANVAS",
    imageKey: "material18oz",
    points: ["Poly-cotton canvas", "Stretch and frame", "Indoor displays"],
  },
  {
    id: "ECONOSTAND",
    imageKey: "industryRestaurant",
    points: ['Fixed 33.5" × 80"', "Stand included", "Indoor floors"],
  },
  {
    id: "RETRACTABLE",
    imageKey: "industryRealEstate",
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
            const image = placeholders[family.imageKey];
            return (
              <Link
                key={family.id}
                href={productOrderHref(family.id)}
                className="overflow-hidden rounded-card border border-line bg-surface shadow-elev-1 no-underline transition-all hover:-translate-y-0.5 hover:shadow-elev-2"
              >
                <article>
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <PlaceholderImage
                      src={image.src}
                      alt={image.alt}
                      width={image.width}
                      height={image.height}
                      rounded="none"
                      overlay
                      sizes="(max-width: 768px) 100vw, 25vw"
                    />
                  </div>
                  <div className="p-lg">
                    <h3 className="font-bold text-heading-h4 text-ink font-body">{product.title}</h3>
                    <p className="mt-sm text-sm text-ink-muted leading-relaxed font-body">
                      {product.subtitle}
                    </p>
                    <ul className="mt-md space-y-xs text-sm text-ink font-body">
                      {family.points.map((point) => (
                        <li key={point} className="flex items-center gap-xs">
                          <CheckCircle2 className="h-4 w-4 text-ink-muted" aria-hidden />
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                </article>
              </Link>
            );
          })}
        </ScrollReveal>
      </div>
    </section>
  );
}
