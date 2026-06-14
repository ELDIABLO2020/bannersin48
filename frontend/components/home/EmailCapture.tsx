"use client";

import Link from "next/link";
import { ArrowRight, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EmailCapture() {
  return (
    <section
      className="relative isolate overflow-hidden bg-soft-accent text-ink"
      aria-labelledby="capture-h"
    >
      {/* Subtle soft-accent-2 wash on the trailing edge */}
      <div
        className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_85%_50%,#E0F2FE_0%,transparent_55%)]"
        aria-hidden
      />
      <div className="mx-auto max-w-content px-md lg:px-2xl py-3xl">
        <div className="grid grid-cols-1 gap-xl lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="ec-copy">
            <h2
              id="capture-h"
              className="font-display font-extrabold tracking-tight text-[clamp(34px,5vw,58px)] leading-[1.05] text-ink"
            >
              Ready to get your banner in 48 hours?
            </h2>
            <p className="mt-md max-w-2xl text-body text-ink-muted">
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
              <Button variant="outline" size="lg">
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
