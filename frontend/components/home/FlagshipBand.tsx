import Link from "next/link";
import { ArrowRight, Clock, FileCheck2, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlaceholderImage } from "@/components/ui/PlaceholderImage";
import { placeholders } from "@/content/placeholders";

const STEPS = [
  { icon: Clock, label: "Order by cutoff" },
  { icon: FileCheck2, label: "Approve proof" },
  { icon: Truck, label: "Ships in 48 hrs" },
] as const;

export function FlagshipBand() {
  const image = placeholders.flagshipProduction;

  return (
    <section className="bg-soft-accent" aria-labelledby="flagship-h">
      <div className="mx-auto max-w-content px-md lg:px-2xl py-3xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2xl items-center">
          <div>
            <p className="text-strong-accent font-semibold text-sm mb-md font-body">48-hour production</p>
            <h2
              id="flagship-h"
              className="font-display tracking-tight text-[clamp(34px,4.5vw,68px)] leading-[1.05] text-ink uppercase"
            >
              Banners on your timeline, not ours
            </h2>
            <p className="mt-md text-body text-ink-muted max-w-lg font-body">
              Order by 9 PM ET, approve your proof, and count on FedEx delivery in 48 business
              hours across the US and Canada.
            </p>
            <ul className="mt-xl flex flex-wrap gap-md">
              {STEPS.map((step) => {
                const Icon = step.icon;
                return (
                  <li
                    key={step.label}
                    className="flex items-center gap-sm rounded-pill bg-surface border border-line px-md py-sm text-sm font-semibold text-ink font-body"
                  >
                    <Icon className="h-4 w-4 text-strong-accent" aria-hidden />
                    {step.label}
                  </li>
                );
              })}
            </ul>
            <Link href="/order/vinyl" className="mt-xl inline-block">
              <Button variant="cta" size="lg">
                Start your order
                <ArrowRight className="ml-sm h-5 w-5" aria-hidden />
              </Button>
            </Link>
          </div>
          <div className="rounded-card bg-darkest p-md lg:p-lg shadow-elev-3 max-w-md mx-auto lg:mx-0 lg:ml-auto overflow-hidden">
            <div className="relative aspect-square rounded-card overflow-hidden">
              <PlaceholderImage
                src={image.src}
                alt={image.alt}
                width={image.width}
                height={image.height}
                sizes="(max-width: 1024px) 100vw, 400px"
              />
            </div>
            <div className="mt-md flex justify-between text-xs text-white/70 font-body px-sm">
              <span>Proof approved</span>
              <span className="text-strong-accent font-semibold">In production</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
