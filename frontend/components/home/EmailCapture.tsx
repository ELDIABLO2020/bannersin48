"use client";

import { EmailCtaForm } from "@/components/marketing/EmailCtaForm";

export function EmailCapture() {
  return (
    <section
      className="relative isolate overflow-hidden bg-soft-accent text-ink"
      aria-labelledby="capture-h"
    >
      <div
        className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_85%_50%,#fef3c7_0%,transparent_55%)]"
        aria-hidden
      />
      <div className="mx-auto max-w-content px-md lg:px-2xl py-3xl">
        <div className="grid grid-cols-1 gap-xl lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="ec-copy max-w-2xl">
            <h2
              id="capture-h"
              className="font-display font-extrabold tracking-tight text-[clamp(34px,5vw,58px)] leading-[1.05] text-ink"
            >
              Your banner, at its best
            </h2>
            <p className="mt-md max-w-2xl text-body text-ink-muted">
              Order now, upload your artwork, and keep your project moving with a clear cutoff
              window and delivery promise.
            </p>
          </div>
          <div className="ec-actions w-full max-w-md lg:max-w-lg">
            <EmailCtaForm buttonLabel="Start your order" />
          </div>
        </div>
      </div>
    </section>
  );
}
