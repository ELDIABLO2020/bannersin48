const STEPS = [
  {
    n: 1,
    title: "Pick your size & material",
    body: "Use a quick-pick or enter custom feet & inches. We round up to billable size and show the live price.",
  },
  {
    n: 2,
    title: "Upload your artwork",
    body: "PDF, JPG, or JPEG. We'll show an instant proof — what you upload is what we print.",
  },
  {
    n: 3,
    title: "Approve your instant proof",
    body: "Five quick acknowledgements. A 10-minute cancellation window starts after approval.",
  },
  {
    n: 4,
    title: "Delivered by noon, guaranteed",
    body: "FedEx only, anywhere in the US & Canada. If we miss, the $10 shipping fee is refunded.",
  },
] as const;

export function HowItWorks() {
  return (
    <section
      className="bg-navy-deep text-white"
      aria-labelledby="how-h"
    >
      <div className="mx-auto max-w-content px-md lg:px-2xl py-3xl">
        <h2 id="how-h" className="font-display text-section-h2 text-center leading-section-h2">
          How it works
        </h2>
        <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-xl mt-2xl">
          {STEPS.map((s) => (
            <li key={s.n} className="relative">
              <div
                className="inline-flex items-center justify-center w-10 h-10 rounded-pill font-bold text-body bg-link text-white mb-md"
                aria-hidden
              >
                {s.n}
              </div>
              <h3 className="font-bold text-heading-h4 leading-heading-h4 mb-xs">{s.title}</h3>
              <p className="text-body-sm text-white/70 leading-relaxed">{s.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
