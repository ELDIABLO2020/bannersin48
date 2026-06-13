"use client";

import { CheckCircle2, FileUp, Printer, Ruler, Truck } from "lucide-react";

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
      className="bg-navy-deep text-white"
      aria-labelledby="how-h"
    >
      <div className="mx-auto max-w-content px-md lg:px-2xl py-3xl">
        <div className="text-center">
          <h2 id="how-h" className="font-display uppercase text-[46px] sm:text-[64px] leading-[0.95]">
            How it works
          </h2>
          <p className="mt-sm text-white/[0.78]">Simple process. Professional results.</p>
        </div>

        <ol className="relative mt-2xl grid grid-cols-1 gap-lg md:grid-cols-4">
          <span
            className="absolute left-[12.5%] right-[12.5%] top-10 hidden border-t border-dashed border-white/[0.28] md:block"
            aria-hidden
          />
          {STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <li key={step.n} className="hw-step relative">
                <div className="relative z-10 flex h-full flex-col rounded-feature border border-white/10 bg-white/[0.06] p-lg">
                  <div className="inline-flex h-16 w-16 items-center justify-center rounded-feature bg-link text-white shadow-elev-3">
                    <Icon className="h-8 w-8" aria-hidden />
                  </div>
                  <div className="mt-lg flex items-start gap-sm">
                    <span className="font-display text-[28px] leading-none text-cta">
                      {step.n}
                    </span>
                    <div>
                      <h3 className="font-bold uppercase leading-tight">{step.title}</h3>
                      <p className="mt-sm text-sm leading-relaxed text-white/[0.72]">{step.body}</p>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>

        <div className="mt-2xl rounded-feature border border-white/10 bg-white/[0.06] p-lg">
          <div className="flex flex-col gap-md md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-bold uppercase text-cta">Production promise</p>
              <p className="mt-xs max-w-2xl text-white/[0.76]">
                The workflow is intentionally narrow: banner size, artwork upload, proof approval,
                production, and shipment.
              </p>
            </div>
            <div className="flex items-center gap-sm text-sm font-bold text-white">
              <CheckCircle2 className="h-5 w-5 text-cta" aria-hidden />
              Proof approval starts the clock
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
