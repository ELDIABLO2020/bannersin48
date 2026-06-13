"use client";

import Link from "next/link";
import { ArrowRight, Headphones, Maximize2, Upload } from "lucide-react";

const ACTIONS = [
  {
    href: "/order/vinyl",
    icon: Maximize2,
    label: "Choose size",
    description: "Start with popular dimensions or enter a custom size.",
  },
  {
    href: "/order/artwork",
    icon: Upload,
    label: "Upload artwork",
    description: "Use your print-ready PDF, JPG, or JPEG design.",
  },
  {
    href: "/help",
    icon: Headphones,
    label: "Need help?",
    description: "Review file guidelines before you place the order.",
  },
] as const;

export function QuickActions() {
  return (
    <section
      className="bg-[linear-gradient(180deg,#eef7ff_0%,#ffffff_100%)]"
      aria-labelledby="quick-actions-h"
    >
      <div className="mx-auto max-w-content px-md lg:px-2xl py-3xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2xl items-center">
          <div className="lg:col-span-5">
            <h2
              id="quick-actions-h"
              className="font-display uppercase text-[44px] sm:text-[58px] leading-[0.95] text-ink"
            >
              Start your order in seconds
            </h2>
            <p className="mt-md text-body text-ink-muted max-w-md">
              Choose the fastest path for the banner you need. The order flow stays direct,
              practical, and focused on getting your file to production.
            </p>
            <Link
              href="/order/vinyl"
              className="mt-xl inline-flex items-center gap-sm rounded-btn bg-cta px-2xl py-sm font-bold text-cta-fg no-underline hover:bg-cta-hover"
            >
              Start an order
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>

          <div className="lg:col-span-7">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-md">
              {ACTIONS.map((a) => {
                const Icon = a.icon;
                return (
                  <Link
                    key={a.href}
                    href={a.href}
                    className="qa-card group block min-h-[190px] rounded-feature border border-line bg-surface p-lg shadow-elev-1 no-underline transition-all hover:-translate-y-1 hover:border-link hover:shadow-elev-3"
                    aria-label={a.label}
                  >
                    <div className="flex h-full flex-col">
                      <span className="inline-flex h-12 w-12 items-center justify-center rounded-feature bg-info-tint text-link">
                        <Icon className="h-6 w-6" aria-hidden />
                      </span>
                      <h3 className="mt-lg font-bold text-heading-h4 text-ink leading-tight">
                        {a.label}
                      </h3>
                      <p className="mt-sm text-sm text-ink-muted leading-relaxed">
                        {a.description}
                      </p>
                      <span className="mt-auto pt-lg inline-flex items-center gap-xs text-sm font-bold text-link">
                        Continue
                        <ArrowRight
                          className="h-4 w-4 transition-transform group-hover:translate-x-1"
                          aria-hidden
                        />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-3xl overflow-hidden rounded-feature border border-line bg-surface shadow-elev-2">
          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="p-xl sm:p-2xl">
              <p className="text-sm font-bold uppercase text-link">Banner-ready artwork</p>
              <h3 className="mt-sm font-display uppercase text-[36px] leading-none text-ink">
                Built for high-visibility jobs
              </h3>
              <p className="mt-md max-w-xl text-body text-ink-muted">
                Use banners for job sites, storefronts, school events, sponsorships, real
                estate launches, and one-week turnarounds that cannot wait on a custom quote
                cycle.
              </p>
            </div>
            <div className="relative min-h-[260px] bg-navy-deep p-lg">
              <div
                className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_20%_20%,#0f77cc_0%,transparent_35%),radial-gradient(circle_at_90%_10%,#ff9b24_0%,transparent_28%)]"
                aria-hidden
              />
              <div className="relative mx-auto flex h-full max-w-lg items-center">
                <div className="w-full rotate-[-2deg] rounded-sm border-4 border-white/15 bg-[linear-gradient(135deg,#07182a,#0f3f74_55%,#ff9b24_56%,#ff6b00)] p-lg shadow-elev-4">
                  <div className="rounded-sm border border-white/20 bg-black/20 p-xl text-white">
                    <p className="text-sm font-bold uppercase text-cta">Grand opening</p>
                    <p className="mt-sm font-display uppercase text-[42px] leading-none">
                      Make the message visible
                    </p>
                    <p className="mt-md text-sm text-white/80">
                      Crisp vinyl print, welded seams, grommets, and fast shipping.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
