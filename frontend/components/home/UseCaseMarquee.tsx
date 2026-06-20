import Link from "next/link";

const USE_CASES = [
  { label: "Contractors", href: "/order/vinyl?use=contractor" },
  { label: "Restaurants", href: "/order/vinyl?use=restaurant" },
  { label: "Schools", href: "/order/vinyl?use=school" },
  { label: "Real Estate", href: "/order/vinyl?use=real-estate" },
  { label: "Events", href: "/order/vinyl?use=events" },
  { label: "Retail", href: "/order/vinyl?use=business" },
  { label: "Sports Teams", href: "/order/vinyl?use=school" },
  { label: "Grand Openings", href: "/order/vinyl?use=business" },
] as const;

export function UseCaseMarquee() {
  const items = [...USE_CASES, ...USE_CASES];

  return (
    <section className="overflow-hidden bg-soft-accent text-ink border-y border-line" aria-label="Popular banner use cases">
      <div className="marquee-track flex w-max items-center gap-md py-md px-md text-sm font-semibold">
        {items.map((item, index) => (
          <span key={`${item.label}-${index}`} className="inline-flex items-center gap-md whitespace-nowrap">
            <Link
              href={item.href}
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
