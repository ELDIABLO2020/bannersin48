"use client";

import { useState } from "react";
import { Clock, FileCheck2, Layers, Truck } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { PlaceholderImage } from "@/components/ui/PlaceholderImage";
import { placeholders, type PlaceholderKey } from "@/content/placeholders";

const PILLARS = [
  {
    id: "order",
    label: "Order fast",
    title: "Start your banner order in minutes",
    description:
      "Pick a size, choose your material, and upload artwork without wading through extra steps.",
    icon: Clock,
    imageKey: "pillarOrder" as PlaceholderKey,
  },
  {
    id: "materials",
    label: "Choose materials",
    title: "Vinyl built for real-world use",
    description:
      "13 oz matte, 15 oz gloss, and mesh options with grommets, pole pockets, or hems.",
    icon: Layers,
    imageKey: "pillarMaterials" as PlaceholderKey,
  },
  {
    id: "proof",
    label: "Approve proof",
    title: "Review before we print",
    description:
      "We send a proof for approval so you know exactly what ships to your door.",
    icon: FileCheck2,
    imageKey: "pillarProof" as PlaceholderKey,
  },
  {
    id: "deliver",
    label: "Deliver in 48",
    title: "48 business-hour delivery promise",
    description:
      "Order by 9 PM ET and get FedEx delivery across the US and Canada on our production schedule.",
    icon: Truck,
    imageKey: "pillarDeliver" as PlaceholderKey,
  },
] as const;

export function FeaturePillars() {
  const [active, setActive] = useState<string>(PILLARS[0].id);
  const current = PILLARS.find((p) => p.id === active) ?? PILLARS[0];
  const Icon = current.icon;
  const image = placeholders[current.imageKey];

  return (
    <section className="bg-soft-accent" aria-labelledby="pillars-h">
      <div className="mx-auto max-w-content px-md lg:px-2xl py-3xl">
        <div className="text-center max-w-3xl mx-auto mb-2xl">
          <h2
            id="pillars-h"
            className="font-display tracking-tight text-[clamp(34px,4.5vw,68px)] leading-[1.05] text-ink uppercase"
          >
            Grow your visibility, not your wait time
          </h2>
          <p className="mt-md text-body text-ink-muted font-body">
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
                "px-lg py-sm rounded-pill text-sm font-semibold transition-colors font-body",
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
            <h3 className="font-display text-[clamp(28px,3vw,36px)] tracking-tight text-ink uppercase">
              {current.title}
            </h3>
            <p className="mt-md text-body text-ink-muted max-w-lg font-body">{current.description}</p>
          </div>
          <div className="relative rounded-card shadow-elev-3 overflow-hidden aspect-[4/3] border border-line bg-surface">
            <PlaceholderImage
              src={image.src}
              alt={image.alt}
              width={image.width}
              height={image.height}
              sizes="(max-width: 1024px) 100vw, 560px"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
