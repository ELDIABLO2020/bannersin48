"use client";

import Link from "next/link";
import { ArrowRight, Building2, GraduationCap, Megaphone, Store } from "lucide-react";

const SCENARIOS = [
  {
    icon: Store,
    title: "Retail launches",
    body: "Grand openings, seasonal sales, curbside pickup, and high-traffic storefront promotions.",
  },
  {
    icon: Building2,
    title: "Contractor sites",
    body: "Jobsite visibility, safety messaging, sponsor placements, and directional signage.",
  },
  {
    icon: GraduationCap,
    title: "Schools & teams",
    body: "Graduation banners, tournament signage, booster events, and campus announcements.",
  },
  {
    icon: Megaphone,
    title: "Events",
    body: "Festivals, markets, fundraisers, trade booths, conferences, and last-minute campaigns.",
  },
] as const;

export function Reviews() {
  return (
    <section className="bg-surface" aria-labelledby="reviews-h">
      <div className="mx-auto max-w-content px-md lg:px-2xl py-3xl">
        <div className="mb-2xl flex flex-col gap-md md:flex-row md:items-end md:justify-between">
          <div>
            <h2
              id="reviews-h"
              className="font-display font-extrabold tracking-tight text-[clamp(34px,4.5vw,52px)] leading-[1.05] text-ink"
            >
              Built for banners people need fast
            </h2>
            <p className="mt-md max-w-2xl text-body text-ink-muted">
              The homepage should sell the real jobs Banners In 48 can support, without fake
              testimonials or inflated review counts.
            </p>
          </div>
          <Link
            href="/order/vinyl"
            className="inline-flex items-center gap-xs text-sm font-semibold text-strong-accent no-underline hover:underline"
          >
            Start your banner
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-md">
          {SCENARIOS.map((scenario) => {
            const Icon = scenario.icon;
            return (
              <article
                key={scenario.title}
                className="rev-card rounded-card border border-line bg-surface p-lg shadow-elev-1 transition-all hover:-translate-y-1 hover:shadow-elev-2"
              >
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-card bg-soft-accent text-strong-accent">
                  <Icon className="h-6 w-6" aria-hidden />
                </div>
                <h3 className="mt-lg font-bold text-heading-h4 text-ink">{scenario.title}</h3>
                <p className="mt-sm text-sm leading-relaxed text-ink-muted">{scenario.body}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
