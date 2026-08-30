import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollReveal } from "@/components/animations/ScrollReveal";

export function EmailCapture() {
  return (
    <section
      className="relative isolate overflow-hidden bg-darkest text-white"
      aria-labelledby="cta-h"
    >
      <div
        className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_85%_50%,var(--color-bg-accent-tint)_0%,transparent_45%)] opacity-40"
        aria-hidden
      />
      <div className="mx-auto max-w-content px-md lg:px-2xl py-3xl">
        <ScrollReveal className="grid grid-cols-1 gap-xl lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="max-w-2xl text-center lg:text-left">
            <p className="text-strong-accent-on-dark font-semibold text-sm mb-md font-body">
              Ready when you are
            </p>
            <h2
              id="cta-h"
              className="font-display tracking-tight text-[clamp(34px,5vw,68px)] leading-[1.05] text-white uppercase"
            >
              Start your banner order
            </h2>
            <p className="mt-md max-w-2xl text-body text-white/70 font-body">
              Upload your artwork and keep your project moving with a clear cutoff window and
              delivery estimate.
            </p>
          </div>
          <div className="flex flex-col items-center gap-sm lg:items-end">
            <Link href="/order" className="no-underline">
              <Button variant="cta" size="lg">
                Start your order
                <ArrowRight className="ml-sm h-5 w-5" aria-hidden />
              </Button>
            </Link>
            <p className="text-sm text-white/70 font-body">USA only · USD · Manual payment</p>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
