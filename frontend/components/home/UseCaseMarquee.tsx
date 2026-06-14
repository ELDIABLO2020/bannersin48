const USE_CASES = [
  "Restaurants",
  "Contractors",
  "Schools",
  "Real Estate",
  "Events",
  "Sports Teams",
  "Retail",
  "Grand Openings",
  "Churches",
  "Nonprofits",
] as const;

export function UseCaseMarquee() {
  const items = [...USE_CASES, ...USE_CASES];

  return (
    <section className="overflow-hidden bg-soft-accent text-ink" aria-label="Popular banner use cases">
      <div className="marquee-track flex w-max items-center gap-lg py-sm text-sm font-semibold">
        {items.map((item, index) => (
          <span key={`${item}-${index}`} className="inline-flex items-center gap-lg whitespace-nowrap">
            <span aria-hidden className="text-strong-accent">*</span>
            {item}
          </span>
        ))}
      </div>
    </section>
  );
}
