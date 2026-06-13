"use client";

import Link from "next/link";
import { ArrowRight, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EmailCapture() {
  return (
    <section
      className="relative isolate overflow-hidden bg-navy-base text-white"
      aria-labelledby="capture-h"
    >
      <div
        className="absolute inset-0 -z-10 bg-cover bg-center opacity-[0.35]"
        style={{ backgroundImage: "url('/images/hero-print-workshop.png')" }}
        aria-hidden
      />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(8,22,34,0.98),rgba(8,22,34,0.82))]" aria-hidden />
      <div className="mx-auto max-w-content px-md lg:px-2xl py-3xl">
        <div className="grid grid-cols-1 gap-xl lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="ec-copy">
            <h2
              id="capture-h"
              className="font-display uppercase text-[42px] sm:text-[64px] leading-[0.95]"
            >
              Ready to get your banner in 48 hours?
            </h2>
            <p className="mt-md max-w-2xl text-body text-white/[0.76]">
              Order now, upload your artwork, and keep your project moving with a clear
              cutoff window and delivery promise.
            </p>
          </div>
          <div className="ec-actions flex flex-col gap-sm sm:flex-row">
            <Link href="/order/vinyl">
              <Button variant="cta" size="lg">
                Order a banner
                <ArrowRight className="ml-sm h-5 w-5" aria-hidden />
              </Button>
            </Link>
            <Link href="/order/artwork">
              <Button variant="secondary-on-dark" size="lg">
                <Upload className="mr-sm h-5 w-5" aria-hidden />
                Upload artwork
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
