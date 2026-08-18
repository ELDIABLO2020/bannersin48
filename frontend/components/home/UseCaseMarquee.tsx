import Link from "next/link";
import { CATALOG_MARQUEE, catalogFilterHref } from "@bannersin48/shared";

export function UseCaseMarquee() {
  const items = [...CATALOG_MARQUEE, ...CATALOG_MARQUEE];

  return (
    <section className="overflow-hidden bg-soft-accent text-ink border-y border-line" aria-label="Popular banner use cases">
      <div className="marquee-track flex w-max items-center gap-md py-md px-md text-sm font-semibold">
        {items.map((item, index) => (
          <span key={`${item.label}-${index}`} className="inline-flex items-center gap-md whitespace-nowrap">
            <Link
              href={catalogFilterHref(item.filterId)}
              className="rounded-pill border border-line bg-surface px-md py-xs text-ink no-underline hover:border-link hover:text-link transition-colors"
            >
              {item.label}
            </Link>
          </span>
        ))}
      </div>
    </section>
  );
}
