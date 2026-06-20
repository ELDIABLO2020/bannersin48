"use client";

import { useState } from "react";
import { Clock, FileCheck2, Layers, Truck } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const PILLARS = [
  {
    id: "order",
    label: "Order fast",
    title: "Start your banner order in minutes",
    description:
      "Pick a size, choose your material, and upload artwork without wading through extra steps.",
    icon: Clock,
    mockClass: "bg-[linear-gradient(135deg,var(--color-bg-navy-deep)_0%,var(--color-bg-navy-mid)_100%)]",
    mockLabel: "Size & quantity",
  },
  {
    id: "materials",
    label: "Choose materials",
    title: "Vinyl built for real-world use",
    description:
      "13 oz matte, 15 oz gloss, and mesh options with grommets, pole pockets, or hems.",
    icon: Layers,
    mockClass: "bg-[linear-gradient(135deg,var(--color-bg-soft-accent)_0%,var(--color-border)_100%)]",
    mockLabel: "Material options",
  },
  {
    id: "proof",
    label: "Approve proof",
    title: "Review before we print",
    description:
      "We send a proof for approval so you know exactly what ships to your door.",
    icon: FileCheck2,
    mockClass: "bg-[linear-gradient(135deg,var(--color-bg-gold-tint)_0%,var(--color-strong-accent)_100%)]",
    mockLabel: "Proof approval",
  },
  {
    id: "deliver",
    label: "Deliver in 48",
    title: "48 business-hour delivery promise",
    description:
      "Order by 9 PM ET and get FedEx delivery across the US and Canada on our production schedule.",
    icon: Truck,
    mockClass: "bg-[linear-gradient(135deg,var(--color-bg-navy-deep)_0%,var(--color-bg-navy-dark)_100%)]",
    mockLabel: "Delivery tracking",
  },
] as const;

export function FeaturePillars() {
  const [active, setActive] = useState<string>(PILLARS[0].id);
  const current = PILLARS.find((p) => p.id === active) ?? PILLARS[0];
  const Icon = current.icon;

  return (
    <section className="bg-soft-accent" aria-labelledby="pillars-h">
      <div className="mx-auto max-w-content px-md lg:px-2xl py-3xl">
        <div className="text-center max-w-3xl mx-auto mb-2xl">
          <h2
            id="pillars-h"
            className="font-display font-extrabold tracking-tight text-[clamp(34px,4.5vw,52px)] leading-[1.05] text-ink"
          >
            Grow your visibility, not your wait time
          </h2>
          <p className="mt-md text-body text-ink-muted">
            From upload to delivery, every step is built for banners you need on a deadline.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-sm mb-xl">
          {PILLARS.map((pillar) => (
            <button
              key={pillar.id}
              type="button"
              onClick={() => setActive(pillar.id)}
              className={cn(
                "px-lg py-sm rounded-pill text-sm font-semibold transition-colors",
                active === pillar.id
                  ? "bg-darkest text-white"
                  : "bg-surface text-ink border border-line hover:bg-white",
              )}
            >
              {pillar.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2xl items-center">
          <div>
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-feature bg-strong-accent text-strong-accent-text mb-md">
              <Icon className="h-6 w-6" aria-hidden />
            </div>
            <h3 className="font-display font-extrabold text-[clamp(28px,3vw,36px)] tracking-tight text-ink">
              {current.title}
            </h3>
            <p className="mt-md text-body text-ink-muted max-w-lg">{current.description}</p>
          </div>
          <div
            className={cn(
              "rounded-card shadow-elev-3 aspect-[4/3] flex items-center justify-center p-xl",
              current.mockClass,
            )}
            aria-hidden
          >
            <div className="rounded-modal bg-white/95 shadow-elev-2 p-lg w-full max-w-sm">
              <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide">
                {current.mockLabel}
              </p>
              <div className="mt-md h-32 rounded-sm bg-soft-accent border border-line flex items-center justify-center text-sm text-ink-muted">
                Product UI preview
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
