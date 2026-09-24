"use client";

import { useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ShieldCheck, Truck } from "lucide-react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { prefersReducedMotion } from "@/lib/gsap/registry";
import { ProductionTimeline } from "./ProductionTimeline";
import { PlaceholderImage } from "@/components/ui/PlaceholderImage";
import { placeholders } from "@/content/placeholders";

const PROOF_POINTS = [
  { icon: CheckCircle2, label: "Vinyl, mesh, paper, canvas, and stands" },
  { icon: ShieldCheck, label: "Weather-ready finishing where it counts" },
  { icon: Truck, label: "FedEx delivery across the US" },
] as const;

export function Hero() {
  const heroRef = useRef<HTMLDivElement>(null);
  const heroImage = placeholders.hero;

  useGSAP(
    () => {
      if (!heroRef.current) return;
      if (prefersReducedMotion()) return;

      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      tl.from(".hero-headline", { opacity: 0, y: 24, duration: 0.6 }, 0.1);
      tl.from(".hero-subhead", { opacity: 0, y: 20, duration: 0.55 }, 0.2);
      tl.from(".hero-actions", { opacity: 0, y: 16, duration: 0.5 }, 0.3);
      tl.from(".hero-trust", { opacity: 0, y: 12, duration: 0.45 }, 0.45);
      tl.from(".hero-countdown", { opacity: 0, y: 32, duration: 0.6 }, 0.5);
      tl.from(".hero-media", { opacity: 0, scale: 1.03, duration: 0.8 }, 0.15);
    },
    { scope: heroRef },
  );

  return (
    <section
      ref={heroRef}
      className="relative isolate overflow-hidden bg-lightest text-ink"
      aria-labelledby="hero-heading"
    >
      <div className="mx-auto max-w-content px-md lg:px-2xl pt-xl pb-2xl sm:pt-3xl sm:pb-3xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2xl items-center">
          <div className="lg:col-span-6 max-w-2xl">
            <h1
              id="hero-heading"
              className="hero-headline font-display tracking-tight text-[clamp(40px,6vw,72px)] leading-[1.02] text-ink uppercase"
            >
              Everything to print and ship your banner in 48 business hours
            </h1>
            <p className="hero-subhead text-lg sm:text-xl text-ink-muted mt-lg max-w-xl leading-relaxed font-body">
              Pick a banner, set the size, and upload your artwork. We print, finish, and ship
              it by FedEx so it is hanging before your event starts.
            </p>
            <div className="hero-actions mt-xl flex flex-col sm:flex-row gap-sm">
              <Link href="/order">
                <Button variant="cta" size="lg" className="w-full sm:w-auto">
                  Start your order
                </Button>
              </Link>
              <Link href="/#products">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  See products
                </Button>
              </Link>
            </div>
            <ul className="hero-trust mt-xl grid grid-cols-1 sm:grid-cols-3 gap-md max-w-3xl text-sm text-ink-muted font-body">
              {PROOF_POINTS.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.label} className="flex items-center gap-sm">
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-pill bg-soft-accent text-ink-muted">
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    <span className="leading-tight">{item.label}</span>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="lg:col-span-6">
            <div className="hero-media relative aspect-[4/3] overflow-hidden">
              <PlaceholderImage
                src={heroImage.src}
                alt={heroImage.alt}
                width={heroImage.width}
                height={heroImage.height}
                priority
                framed
                overlay
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
          </div>

          <div className="hero-countdown lg:col-span-12">
            <ProductionTimeline />
          </div>
        </div>
      </div>
    </section>
  );
}
