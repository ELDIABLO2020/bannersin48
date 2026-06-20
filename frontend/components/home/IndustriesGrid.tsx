import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const INDUSTRIES = [
  {
    href: "/order/vinyl?use=contractor",
    label: "Contractor",
    tint: "bg-[linear-gradient(135deg,var(--color-dark),var(--color-bg-navy-deep))]",
    labelClass: "text-white",
  },
  {
    href: "/order/vinyl?use=restaurant",
    label: "Restaurant",
    tint: "bg-[linear-gradient(135deg,var(--color-border),var(--color-bg-soft-accent))]",
    labelClass: "text-ink",
  },
  {
    href: "/order/vinyl?use=school",
    label: "School & Sports",
    tint: "bg-[linear-gradient(135deg,var(--color-bg-navy-deep),var(--color-bg-navy-mid))]",
    labelClass: "text-white",
  },
  {
    href: "/order/vinyl?use=events",
    label: "Events",
    tint: "bg-[linear-gradient(135deg,var(--color-strong-accent),var(--color-bg-gold-tint))]",
    labelClass: "text-ink",
  },
  {
    href: "/order/vinyl?use=business",
    label: "Business",
    tint: "bg-[linear-gradient(135deg,var(--color-bg-navy-dark),var(--color-dark))]",
    labelClass: "text-white",
  },
  {
    href: "/order/vinyl?use=real-estate",
    label: "Real Estate",
    tint: "bg-[linear-gradient(135deg,var(--color-bg-soft-accent),var(--color-border))]",
    labelClass: "text-ink",
  },
] as const;

export function IndustriesGrid() {
  return (
    <section className="bg-soft-accent" aria-labelledby="industries-h">
      <div className="mx-auto max-w-content px-md lg:px-2xl py-3xl">
        <div className="flex flex-col gap-md md:flex-row md:items-end md:justify-between mb-2xl">
          <div>
            <h2
              id="industries-h"
              className="font-display font-extrabold tracking-tight text-[clamp(34px,4.5vw,52px)] leading-[1.05] text-ink"
            >
              Customized banners for every use case
            </h2>
            <p className="mt-md max-w-2xl text-body text-ink-muted">
              From jobsites to grand openings, pick the path that matches your banner job.
            </p>
          </div>
          <Link
            href="/order/vinyl"
            className="inline-flex items-center gap-xs text-sm font-semibold text-link no-underline hover:underline"
          >
            View all use cases
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-md">
          {INDUSTRIES.map((ind) => (
            <Link
              key={ind.label}
              href={ind.href}
              className="group rounded-card overflow-hidden border border-line bg-surface shadow-elev-1 hover:shadow-elev-2 hover:-translate-y-0.5 transition-all no-underline"
            >
              <div className={cn("aspect-[4/3] flex items-end p-md", ind.tint)} aria-hidden>
                <span className={cn("text-sm font-bold drop-shadow-sm group-hover:underline", ind.labelClass)}>
                  {ind.label}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
