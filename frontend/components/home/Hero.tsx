"use client";

import { useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, Clock, FileUp, ShieldCheck, Truck, Upload } from "lucide-react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { prefersReducedMotion } from "@/lib/gsap/registry";
import { CountdownCard } from "./CountdownCard";

const PROOF_POINTS = [
  { icon: CheckCircle2, label: "High-resolution vinyl printing" },
  { icon: ShieldCheck, label: "Weather-ready finishing" },
  { icon: Truck, label: "FedEx delivery across US & Canada" },
] as const;

export function Hero() {
  const heroRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!heroRef.current) return;
      const reduced = prefersReducedMotion();

      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      tl.fromTo(
        heroRef.current.querySelector(".hero-kicker"),
        reduced ? {} : { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.5 },
        0,
      );

      tl.fromTo(
        heroRef.current.querySelector(".hero-headline"),
        reduced ? {} : { opacity: 0, y: 24 },
        { opacity: 1, y: 0, duration: 0.6 },
        0.1,
      );

      tl.fromTo(
        heroRef.current.querySelector(".hero-subhead"),
        reduced ? {} : { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.55 },
        0.2,
      );

      tl.fromTo(
        heroRef.current.querySelector(".hero-actions"),
        reduced ? {} : { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.5 },
        0.35,
      );

      tl.fromTo(
        heroRef.current.querySelector(".hero-trust"),
        reduced ? {} : { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.45 },
        0.45,
      );

      // Countdown card fades in from below with a slight delay
      tl.fromTo(
        heroRef.current.querySelector(".hero-countdown"),
        reduced ? {} : { opacity: 0, y: 32 },
        { opacity: 1, y: 0, duration: 0.6 },
        0.5,
      );

      tl.fromTo(
        heroRef.current.querySelector(".hero-media"),
        reduced ? {} : { opacity: 0, scale: 1.03 },
        { opacity: 1, scale: 1, duration: 0.8 },
        0.15,
      );
    },
    { scope: heroRef },
  );

  return (
    <section
      ref={heroRef}
      className="relative isolate overflow-hidden bg-navy-base text-white"
      aria-labelledby="hero-heading"
    >
      <div
        className="hero-media absolute inset-0 -z-10 bg-cover bg-center opacity-70"
        style={{ backgroundImage: "url('/images/hero-print-workshop.png')" }}
        aria-hidden
      />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(8,22,34,0.98)_0%,rgba(8,22,34,0.9)_36%,rgba(8,22,34,0.48)_68%,rgba(8,22,34,0.2)_100%)]" aria-hidden />
      <div className="absolute inset-x-0 bottom-0 -z-10 h-32 bg-gradient-to-t from-navy-base to-transparent" aria-hidden />

      <div className="mx-auto max-w-hero px-md lg:px-2xl py-3xl lg:py-[96px]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2xl items-end min-h-[620px]">
          <div className="lg:col-span-7 max-w-4xl">
            <p className="hero-kicker text-link text-sm font-bold uppercase mb-md">
              Fast. Durable. Professional.
            </p>
            <h1
              id="hero-heading"
              className="hero-headline font-display uppercase text-[52px] sm:text-[72px] lg:text-[96px] leading-[0.9] font-bold"
            >
              Custom banners delivered in{" "}
              <span className="text-cta">48</span>
              <span className="block text-cta text-[0.56em] leading-none mt-xs">
                business hours
              </span>
            </h1>
            <p className="hero-subhead text-lg sm:text-xl text-white/[0.86] mt-lg max-w-2xl leading-relaxed">
              Premium vinyl banners printed, finished, and shipped fast. Choose your size,
              upload artwork, approve the proof, and keep your event moving.
            </p>
            <div className="hero-actions mt-xl flex flex-col sm:flex-row gap-sm">
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
            <ul className="hero-trust mt-xl grid grid-cols-1 sm:grid-cols-3 gap-md max-w-3xl text-sm text-white/[0.78]">
              {PROOF_POINTS.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.label} className="flex items-center gap-sm">
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-pill border border-white/15 bg-white/[0.08] text-cta">
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    <span className="leading-tight">{item.label}</span>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="hero-countdown lg:col-span-5 lg:justify-self-end w-full max-w-lg">
            <div className="rounded-feature border border-white/15 bg-white/[0.94] p-sm shadow-elev-4 backdrop-blur">
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-sm items-stretch">
                <div className="rounded-feature bg-surface text-ink p-lg">
                  <div className="flex items-center gap-sm text-link">
                    <Clock className="h-5 w-5" aria-hidden />
                    <p className="text-xs font-bold uppercase">Next production cutoff</p>
                  </div>
                  <div className="mt-md">
                    <CountdownCard variant="inline" />
                  </div>
                </div>
                <div className="rounded-feature bg-info-tint text-ink p-lg sm:w-48">
                  <p className="text-xs font-bold uppercase text-link">Order path</p>
                  <ul className="mt-md space-y-sm text-sm font-bold">
                    <li className="flex items-center gap-sm">
                      <FileUp className="h-4 w-4 text-link" aria-hidden />
                      Upload artwork
                    </li>
                    <li className="flex items-center gap-sm">
                      <CheckCircle2 className="h-4 w-4 text-link" aria-hidden />
                      Approve proof
                    </li>
                    <li className="flex items-center gap-sm">
                      <Truck className="h-4 w-4 text-link" aria-hidden />
                      Ships fast
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
