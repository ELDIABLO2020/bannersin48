"use client";

import { useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, Clock, FileUp, ShieldCheck, Truck, Upload } from "lucide-react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { prefersReducedMotion } from "@/lib/gsap/registry";
import { CountdownCard } from "./CountdownCard";
import { PlaceholderImage } from "@/components/ui/PlaceholderImage";
import { placeholders } from "@/content/placeholders";

const PROOF_POINTS = [
  { icon: CheckCircle2, label: "High-resolution vinyl printing" },
  { icon: ShieldCheck, label: "Weather-ready finishing" },
  { icon: Truck, label: "FedEx delivery across US & Canada" },
] as const;

export function Hero() {
  const heroRef = useRef<HTMLDivElement>(null);
  const heroImage = placeholders.hero;

  useGSAP(
    () => {
      if (!heroRef.current) return;
      if (prefersReducedMotion()) return;

      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      tl.from(".hero-kicker", { opacity: 0, y: 16, duration: 0.5 }, 0);
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
      <div
        className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_15%_15%,var(--color-bg-soft-accent)_0%,transparent_55%),radial-gradient(circle_at_85%_25%,var(--color-bg-gold-tint)_0%,transparent_45%)]"
        aria-hidden
      />

      <div className="mx-auto max-w-hero px-md lg:px-2xl pt-4xl pb-3xl lg:pb-4xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2xl items-start min-h-[520px]">
          <div className="lg:col-span-6 max-w-2xl">
            <p className="hero-kicker text-strong-accent text-2xl font-semibold mb-md font-body">
              Fast. Durable. Professional.
            </p>
            <h1
              id="hero-heading"
              className="hero-headline font-display tracking-tight text-[clamp(40px,7vw,83px)] leading-[1.02] text-ink uppercase"
            >
              Everything to print and ship your banner in{" "}
              <span className="text-strong-accent">48 business hours</span>
            </h1>
            <p className="hero-subhead text-lg sm:text-xl text-ink-muted mt-lg max-w-xl leading-relaxed font-body">
              Premium Vinyl Banners Printed, Finished, Shipped and Delivered in 48 Hours
              Guaranteed. Choose your size, upload artwork, approve proof, and keep your event
              moving.
            </p>
            <div className="hero-actions mt-xl flex flex-col sm:flex-row gap-sm">
              <Link href="/order/vinyl">
                <Button variant="cta" size="lg">
                  Start your order
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
            <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-sm items-stretch">
              <div className="rounded-card border border-line bg-surface text-ink p-lg shadow-elev-1">
                <div className="flex items-center gap-sm text-strong-accent">
                  <Clock className="h-5 w-5" aria-hidden />
                  <p className="text-xs font-semibold font-body">Next production cutoff</p>
                </div>
                <div className="mt-md">
                  <CountdownCard variant="inline" />
                </div>
              </div>
              <div className="rounded-card border border-line bg-soft-accent text-ink p-lg shadow-elev-1">
                <p className="text-xs font-semibold text-ink-muted font-body">Order path</p>
                <ul className="mt-md space-y-sm text-sm font-semibold font-body">
                  <li className="flex items-center gap-sm">
                    <FileUp className="h-4 w-4 text-ink-muted" aria-hidden />
                    Upload artwork
                  </li>
                  <li className="flex items-center gap-sm">
                    <CheckCircle2 className="h-4 w-4 text-ink-muted" aria-hidden />
                    Approve proof
                  </li>
                  <li className="flex items-center gap-sm">
                    <Truck className="h-4 w-4 text-ink-muted" aria-hidden />
                    Ships fast
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
