"use client";

import Link from "next/link";
import { ArrowRight, BadgeCheck, Clock3, FileCheck2, MapPinned, Truck } from "lucide-react";

const METRICS = [
  { icon: Clock3, value: "9 PM ET", label: "daily order cutoff" },
  { icon: Truck, value: "48 hr", label: "business-hour delivery promise" },
  { icon: MapPinned, value: "US + CA", label: "FedEx delivery region" },
  { icon: FileCheck2, value: "3 files", label: "PDF, JPG, and JPEG accepted" },
] as const;

export function GuaranteePanel() {
  return (
    <section className="bg-surface" aria-labelledby="guarantee-h">
      <div className="mx-auto max-w-content px-md lg:px-2xl py-3xl">
        <div className="grid grid-cols-1 gap-lg lg:grid-cols-[1fr_420px]">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-md">
            {METRICS.map((metric) => {
              const Icon = metric.icon;
              return (
                <article
                  key={metric.label}
                  className="gp-row rounded-card border border-line bg-surface p-lg text-center shadow-elev-1"
                >
                  <Icon className="mx-auto h-8 w-8 text-strong-accent" aria-hidden />
                  <p className="mt-md font-display font-extrabold tracking-tight text-[32px] leading-none text-ink">
                    {metric.value}
                  </p>
                  <p className="mt-sm text-sm text-ink-muted">{metric.label}</p>
                </article>
              );
            })}
          </div>

          <aside className="gp-row rounded-card border border-strong-accent bg-[linear-gradient(135deg,#E8F5E9,#FFFFFF)] p-xl shadow-elev-2">
            <BadgeCheck className="h-12 w-12 text-strong-accent" aria-hidden />
            <h2
              id="guarantee-h"
              className="mt-md font-display font-extrabold tracking-tight text-[34px] leading-tight text-ink"
            >
              Our 48-hour guarantee
            </h2>
            <p className="mt-md text-body text-ink-muted">
              If we miss the 48-business-hour delivery for reasons on our side, the $10
              shipping charge for that banner is refunded automatically.
            </p>
            <Link
              href="/guarantee"
              className="mt-lg inline-flex items-center gap-xs text-sm font-semibold text-strong-accent no-underline hover:underline"
            >
              Learn about the guarantee
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </aside>
        </div>
      </div>
    </section>
  );
}
