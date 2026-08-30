"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock, FileCheck2, FileUp, LayoutGrid, Printer, Truck } from "lucide-react";
import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { Button } from "@/components/ui/button";
import { PlaceholderImage } from "@/components/ui/PlaceholderImage";
import { placeholders } from "@/content/placeholders";

const STEPS = [
  {
    n: 1,
    icon: LayoutGrid,
    title: "Pick a product",
    body: "Choose vinyl, mesh, paper, canvas, or a stand — then set size when the product is custom.",
  },
  {
    n: 2,
    icon: FileUp,
    title: "Upload artwork",
    body: "Submit a JPEG, PNG, or PDF file and review it at checkout before production starts.",
  },
  {
    n: 3,
    icon: Printer,
    title: "We print and ship",
    body: "Your banner is printed, checked, packed, and shipped FedEx — the delivery estimate stays visible before you order.",
  },
] as const;

const PATH_PILLS = [
  { icon: Clock, label: "Order by cutoff" },
  { icon: FileCheck2, label: "Review artwork" },
  { icon: Truck, label: "Ships in 48 hrs" },
] as const;

export function HowItWorks() {
  const image = placeholders.flagshipProduction;

  return (
    <section className="bg-light text-ink" aria-labelledby="how-h">
      <div className="mx-auto max-w-content px-md lg:px-2xl py-3xl">
        <ScrollReveal className="grid grid-cols-1 lg:grid-cols-2 gap-2xl items-start">
          <div>
            <p className="text-strong-accent font-semibold text-sm mb-md font-body">
              48-hour production
            </p>
            <h2
              id="how-h"
              className="font-display tracking-tight text-[clamp(36px,5vw,58px)] leading-[1.05] text-ink uppercase"
            >
              How it works
            </h2>
            <p className="mt-sm text-ink-muted max-w-lg font-body">
              Submit your order, confirm manual payment, and count on FedEx delivery in 48
              business hours within the United States.
            </p>

            <ul className="mt-xl flex flex-wrap gap-md">
              {PATH_PILLS.map((step) => {
                const Icon = step.icon;
                return (
                  <li
                    key={step.label}
                    className="flex items-center gap-sm rounded-pill bg-surface border border-line px-md py-sm text-sm font-semibold text-ink font-body"
                  >
                    <Icon className="h-4 w-4 text-ink-muted" aria-hidden />
                    {step.label}
                  </li>
                );
              })}
            </ul>

            <Link href="/order" className="mt-xl inline-block">
              <Button variant="cta" size="lg">
                Start your order
                <ArrowRight className="ml-sm h-5 w-5" aria-hidden />
              </Button>
            </Link>
          </div>

          <div className="rounded-card bg-darkest p-md lg:p-lg shadow-elev-3 max-w-md mx-auto lg:mx-0 lg:ml-auto overflow-hidden">
            <div className="relative aspect-square overflow-hidden rounded-card">
              <PlaceholderImage
                src={image.src}
                alt={image.alt}
                width={image.width}
                height={image.height}
                framed
                overlay
                sizes="(max-width: 1024px) 100vw, 400px"
              />
            </div>
            <div className="mt-md flex justify-between text-xs text-white/70 font-body px-sm">
              <span>Artwork reviewed</span>
              <span className="text-strong-accent-on-dark font-semibold">In production</span>
            </div>
          </div>
        </ScrollReveal>

        <ScrollReveal
          as="ol"
          className="relative mt-2xl grid grid-cols-1 gap-lg md:grid-cols-3"
          selector=".hw-step"
        >
          <span
            className="absolute left-[16.5%] right-[16.5%] top-10 hidden border-t border-dashed border-line md:block"
            aria-hidden
          />
          {STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <li key={step.n} className="hw-step relative">
                <div className="relative z-10 flex h-full flex-col rounded-card border border-line bg-surface p-lg shadow-elev-1">
                  <div className="inline-flex h-16 w-16 items-center justify-center rounded-card bg-soft-accent text-ink-muted shadow-elev-1">
                    <Icon className="h-8 w-8" aria-hidden />
                  </div>
                  <div className="mt-lg flex items-start gap-sm">
                    <span className="font-display font-extrabold text-[28px] leading-none text-ink-muted">
                      {step.n}
                    </span>
                    <div>
                      <h3 className="font-bold leading-tight text-ink">{step.title}</h3>
                      <p className="mt-sm text-sm leading-relaxed text-ink-muted">{step.body}</p>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ScrollReveal>

        <ScrollReveal className="mt-2xl rounded-card border border-line bg-soft-accent p-lg">
          <div className="flex flex-col gap-md md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-strong-accent">Production promise</p>
              <p className="mt-xs max-w-2xl text-ink-muted">
                The workflow is intentionally narrow: pick a product, set size, upload artwork,
                review it at checkout, then we produce and ship.
              </p>
            </div>
            <div className="flex items-center gap-sm text-sm font-bold text-ink">
              <CheckCircle2 className="h-5 w-5 text-ink-muted" aria-hidden />
              Submission and payment confirmation start the clock
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
