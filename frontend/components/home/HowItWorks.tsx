"use client";

import { CheckCircle2, FileUp, Printer, Ruler, Truck } from "lucide-react";
import { ScrollReveal } from "@/components/animations/ScrollReveal";

const STEPS = [
  {
    n: 1,
    icon: Ruler,
    title: "Choose your size",
    body: "Pick a standard banner size or enter a custom dimension up to 10' x 10'.",
  },
  {
    n: 2,
    icon: FileUp,
    title: "Upload artwork",
    body: "Submit a PDF, JPG, or JPEG file and review the proof before production starts.",
  },
  {
    n: 3,
    icon: Printer,
    title: "We print and finish",
    body: "Your banner is printed, checked, packed, and prepared for fast FedEx delivery.",
  },
  {
    n: 4,
    icon: Truck,
    title: "Delivered fast",
    body: "The delivery promise and cutoff window stay visible before you place the order.",
  },
] as const;

export function HowItWorks() {
  return (
    <section
      className="bg-light text-ink"
      aria-labelledby="how-h"
    >
      <div className="mx-auto max-w-content px-md lg:px-2xl py-3xl">
        <ScrollReveal className="text-center">
          <h2 id="how-h" className="font-display tracking-tight text-[clamp(36px,5vw,58px)] leading-[1.05] text-ink uppercase">
            How it works
          </h2>
          <p className="mt-sm text-ink-muted">Simple process. Professional results.</p>
        </ScrollReveal>

        <ScrollReveal
          as="ol"
          className="relative mt-2xl grid grid-cols-1 gap-lg md:grid-cols-4"
          selector=".hw-step"
        >
          <span
            className="absolute left-[12.5%] right-[12.5%] top-10 hidden border-t border-dashed border-line md:block"
            aria-hidden
          />
          {STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <li key={step.n} className="hw-step relative">
                <div className="relative z-10 flex h-full flex-col rounded-card border border-line bg-surface p-lg shadow-elev-1">
                  <div className="inline-flex h-16 w-16 items-center justify-center rounded-card bg-strong-accent text-strong-accent-text shadow-elev-2">
                    <Icon className="h-8 w-8" aria-hidden />
                  </div>
                  <div className="mt-lg flex items-start gap-sm">
                    <span className="font-display font-extrabold text-[28px] leading-none text-strong-accent">
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

        <ScrollReveal className="mt-2xl rounded-card border border-strong-accent/30 bg-soft-accent p-lg">
          <div className="flex flex-col gap-md md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-strong-accent">Production promise</p>
              <p className="mt-xs max-w-2xl text-ink-muted">
                The workflow is intentionally narrow: banner size, artwork upload, proof approval,
                production, and shipment.
              </p>
            </div>
            <div className="flex items-center gap-sm text-sm font-bold text-ink">
              <CheckCircle2 className="h-5 w-5 text-strong-accent" aria-hidden />
              Proof approval starts the clock
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
