"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getCarouselTestimonials } from "@/content/testimonials";

export function TestimonialsCarousel() {
  const items = getCarouselTestimonials();
  if (items.length === 0) return null;

  return (
    <section className="bg-surface" aria-labelledby="testimonials-carousel-h">
      <div className="mx-auto max-w-content px-md lg:px-2xl py-3xl">
        <div className="flex flex-col gap-md md:flex-row md:items-end md:justify-between mb-2xl">
          <h2
            id="testimonials-carousel-h"
            className="font-display tracking-tight text-[clamp(34px,4.5vw,68px)] leading-[1.05] text-ink uppercase"
          >
            Hear from Banners In 48 customers
          </h2>
          <Link
            href="/reviews"
            className="inline-flex items-center gap-xs text-sm font-semibold text-link no-underline hover:underline"
          >
            View all testimonials
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-lg">
          {items.map((t) => (
            <article
              key={t.id}
              className="rounded-card border border-line bg-soft-accent p-xl shadow-elev-1"
            >
              <p className="text-xs font-semibold text-strong-accent uppercase tracking-wide">
                {t.industry}
              </p>
              <blockquote className="mt-md text-body text-ink leading-relaxed">
                &ldquo;{t.quote}&rdquo;
              </blockquote>
              <p className="mt-lg text-sm font-semibold text-ink">
                {t.name}
                <span className="text-ink-muted font-normal"> — {t.company}</span>
              </p>
              {t.metrics && t.metrics.length > 0 && (
                <div className="mt-md flex flex-wrap gap-sm">
                  {t.metrics.map((m) => (
                    <div
                      key={m.label}
                      className="rounded-pill bg-surface border border-line px-md py-xs text-xs"
                    >
                      <span className="font-bold text-ink">{m.value}</span>
                      <span className="text-ink-muted"> {m.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
