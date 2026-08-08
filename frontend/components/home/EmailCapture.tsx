"use client";

import { EmailCtaForm } from "@/components/marketing/EmailCtaForm";
import { ScrollReveal } from "@/components/animations/ScrollReveal";

export function EmailCapture() {
  return (
    <section
      className="relative isolate overflow-hidden bg-darkest text-white"
      aria-labelledby="capture-h"
    >
      <div
        className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_85%_50%,var(--color-bg-gold-tint)_0%,transparent_45%)] opacity-40"
        aria-hidden
      />
      <div className="mx-auto max-w-content px-md lg:px-2xl py-3xl">
        <ScrollReveal className="grid grid-cols-1 gap-xl lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="ec-copy max-w-2xl text-center lg:text-left">
            <p className="text-strong-accent font-semibold text-sm mb-md font-body">
              Ready when you are
            </p>
            <h2
              id="capture-h"
              className="font-display tracking-tight text-[clamp(34px,5vw,68px)] leading-[1.05] text-white uppercase"
            >
              Your banner, at its best
            </h2>
            <p className="mt-md max-w-2xl text-body text-white/70 font-body">
              Order now, upload your artwork, and keep your project moving with a clear cutoff
              window and delivery promise.
            </p>
          </div>
          <div className="ec-actions w-full max-w-md lg:max-w-lg">
            <EmailCtaForm
              buttonLabel="Start your order"
              microcopyClassName="text-white/70"
            />
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
