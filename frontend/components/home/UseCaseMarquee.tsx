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
    <section className="overflow-hidden bg-link text-white" aria-label="Popular banner use cases">
      <div className="marquee-track flex w-max items-center gap-lg py-sm text-sm font-bold uppercase">
        {items.map((item, index) => (
          <span key={`${item}-${index}`} className="inline-flex items-center gap-lg whitespace-nowrap">
            <span aria-hidden className="text-cta">*</span>
            {item}
          </span>
        ))}
      </div>
    </section>
  );
}
