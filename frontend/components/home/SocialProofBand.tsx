import { Clock3, MapPinned, Truck } from "lucide-react";

const STATS = [
  { icon: Clock3, value: "9 PM ET", label: "daily order cutoff" },
  { icon: Truck, value: "48 hr", label: "business-hour delivery promise" },
  { icon: MapPinned, value: "US + CA", label: "FedEx delivery region" },
] as const;

export function SocialProofBand() {
  return (
    <section className="bg-surface border-y border-line" aria-labelledby="social-proof-h">
      <div className="mx-auto max-w-content px-md lg:px-2xl py-3xl">
        <div className="text-center mb-2xl">
          <h2
            id="social-proof-h"
            className="font-display font-extrabold tracking-tight text-[clamp(34px,4.5vw,52px)] leading-[1.05] text-ink"
          >
            Trusted for fast, professional banners
          </h2>
          <p className="mt-md text-body text-ink-muted max-w-2xl mx-auto">
            Built for contractors, retailers, schools, and event teams who need signage on a deadline.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-lg">
          {STATS.map((stat) => {
            const Icon = stat.icon;
            return (
              <article
                key={stat.label}
                className="rounded-card border border-line bg-soft-accent p-xl text-center"
              >
                <Icon className="mx-auto h-8 w-8 text-strong-accent" aria-hidden />
                <p className="mt-md font-display font-extrabold text-[clamp(32px,4vw,48px)] leading-none text-ink tabular-nums">
                  {stat.value}
                </p>
                <p className="mt-sm text-sm text-ink-muted">{stat.label}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
