import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { VisualCategoryCard } from "@/components/catalog/VisualCategoryCard";
import { imageForUseCase } from "@/content/catalogImages";
import { catalogFilterHref, type CatalogUseCaseId } from "@bannersin48/shared";

const INDUSTRIES: ReadonlyArray<{ id: CatalogUseCaseId; label: string }> = [
  { id: "contractor", label: "Contractor" },
  { id: "restaurant", label: "Restaurant" },
  { id: "school", label: "School & Sports" },
  { id: "events", label: "Events" },
  { id: "business", label: "Business" },
  { id: "real-estate", label: "Real Estate" },
];

export function IndustriesGrid() {
  return (
    <section className="bg-soft-accent" aria-labelledby="industries-h">
      <div className="mx-auto max-w-content px-md lg:px-2xl py-3xl">
        <ScrollReveal className="mb-2xl text-center">
          <p className="text-strong-accent font-semibold text-sm mb-md font-body">Use cases</p>
          <h2
            id="industries-h"
            className="font-display tracking-tight text-[clamp(34px,4.5vw,68px)] leading-[1.05] text-ink uppercase"
          >
            Customized banners for every use case
          </h2>
          <p className="mt-md mx-auto max-w-2xl text-body text-ink-muted font-body">
            From jobsites to grand openings, we recommend the products that fit the job.
          </p>
          <Link
            href="/order"
            className="mt-md inline-flex items-center gap-xs text-sm font-semibold text-link no-underline hover:underline font-body"
          >
            View all products
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </ScrollReveal>
        <ScrollReveal className="grid grid-cols-2 md:grid-cols-3 gap-md">
          {INDUSTRIES.map((ind) => (
            <VisualCategoryCard
              key={ind.id}
              href={catalogFilterHref(ind.id)}
              title={ind.label}
              image={imageForUseCase(ind.id)}
              cta="Shop"
              sizes="(max-width: 768px) 50vw, 33vw"
            />
          ))}
        </ScrollReveal>
      </div>
    </section>
  );
}
