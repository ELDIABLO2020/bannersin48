import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { PlaceholderImage } from "@/components/ui/PlaceholderImage";
import { placeholders, type PlaceholderKey } from "@/content/placeholders";

const INDUSTRIES: ReadonlyArray<{
  href: string;
  label: string;
  imageKey: PlaceholderKey;
}> = [
  { href: "/order/vinyl?use=contractor", label: "Contractor", imageKey: "industryContractor" },
  { href: "/order/vinyl?use=restaurant", label: "Restaurant", imageKey: "industryRestaurant" },
  { href: "/order/vinyl?use=school", label: "School & Sports", imageKey: "industrySchool" },
  { href: "/order/vinyl?use=events", label: "Events", imageKey: "industryEvents" },
  { href: "/order/vinyl?use=business", label: "Business", imageKey: "industryBusiness" },
  { href: "/order/vinyl?use=real-estate", label: "Real Estate", imageKey: "industryRealEstate" },
];

export function IndustriesGrid() {
  return (
    <section className="bg-soft-accent" aria-labelledby="industries-h">
      <div className="mx-auto max-w-content px-md lg:px-2xl py-3xl">
        <ScrollReveal className="flex flex-col gap-md md:flex-row md:items-end md:justify-between mb-2xl">
          <div>
            <h2
              id="industries-h"
              className="font-display tracking-tight text-[clamp(34px,4.5vw,68px)] leading-[1.05] text-ink uppercase"
            >
              Customized banners for every use case
            </h2>
            <p className="mt-md max-w-2xl text-body text-ink-muted font-body">
              From jobsites to grand openings, pick the path that matches your banner job.
            </p>
          </div>
          <Link
            href="/order/vinyl"
            className="inline-flex items-center gap-xs text-sm font-semibold text-link no-underline hover:underline font-body"
          >
            View all use cases
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </ScrollReveal>
        <ScrollReveal className="grid grid-cols-2 md:grid-cols-3 gap-md">
          {INDUSTRIES.map((ind) => {
            const image = placeholders[ind.imageKey];
            return (
              <Link
                key={ind.label}
                href={ind.href}
                className="group rounded-card overflow-hidden border border-line bg-surface shadow-elev-1 hover:shadow-elev-2 hover:-translate-y-0.5 transition-all no-underline"
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  <PlaceholderImage
                    src={image.src}
                    alt={image.alt}
                    width={image.width}
                    height={image.height}
                    sizes="(max-width: 768px) 50vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-darkest/80 via-darkest/20 to-transparent" />
                  <span className="absolute bottom-md left-md text-sm font-bold text-white drop-shadow-sm group-hover:underline font-body">
                    {ind.label}
                  </span>
                </div>
              </Link>
            );
          })}
        </ScrollReveal>
      </div>
    </section>
  );
}
