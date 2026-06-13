"use client";

import { useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Upload, Star, Clock, Truck, Shield } from "lucide-react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { prefersReducedMotion } from "@/lib/gsap/registry";
import { CountdownCard } from "./CountdownCard";

export function Hero() {
  const heroRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!heroRef.current) return;
      const reduced = prefersReducedMotion();

      // Hero entrance: staggered fade-up for the left-column content
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      tl.fromTo(
        heroRef.current.querySelector(".hero-eyebrow"),
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
    },
    { scope: heroRef },
  );

  return (
    <section
      ref={heroRef}
      className="bg-navy-base text-white"
      aria-labelledby="hero-heading"
    >
      <div className="mx-auto max-w-hero px-md lg:px-2xl py-3xl lg:py-4xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-xl items-center">
          {/* Left: copy + CTAs */}
          <div className="lg:col-span-7">
            <p className="hero-eyebrow text-cta text-sm font-bold tracking-widest uppercase mb-sm">
              Vinyl & Retractable Banners
            </p>
            <h1
              id="hero-heading"
              className="hero-headline font-display text-[40px] sm:text-[56px] lg:text-hero-h1 lg:leading-hero-h1 font-normal tracking-tight"
            >
              Custom Banners. <br className="hidden sm:inline" />
              Delivered in{" "}
              <span className="text-cta">48 Business Hours.</span>
            </h1>
            <p className="hero-subhead text-base sm:text-lg text-white/80 mt-lg max-w-2xl">
              Any size up to 10&prime; &times; 10&prime;. Clear pricing. Guaranteed by noon. Order by 9 PM ET.
            </p>
            <div className="hero-actions mt-xl flex flex-col sm:flex-row gap-sm">
              <Link href="/order/vinyl">
                <Button variant="cta" size="lg">
                  Order a Banner
                  <ArrowRight className="ml-sm h-5 w-5" aria-hidden />
                </Button>
              </Link>
              <Link href="/order/artwork">
                <Button variant="secondary-on-dark" size="lg">
                  <Upload className="mr-sm h-5 w-5" aria-hidden />
                  Upload Your Artwork
                </Button>
              </Link>
            </div>
            <ul className="hero-trust mt-2xl flex flex-wrap gap-x-xl gap-y-sm text-sm text-white/70">
              <li className="flex items-center gap-xs"><Truck className="h-4 w-4" aria-hidden /> FedEx</li>
              <li className="flex items-center gap-xs"><Shield className="h-4 w-4" aria-hidden /> US & Canada</li>
              <li className="flex items-center gap-xs"><Clock className="h-4 w-4" aria-hidden /> Guaranteed by noon</li>
              <li className="flex items-center gap-xs"><Star className="h-4 w-4 text-cta" aria-hidden /> No inbound phone calls</li>
            </ul>
          </div>

          {/* Right: countdown card */}
          <div className="hero-countdown lg:col-span-5">
            <CountdownCard variant="hero" />
          </div>
        </div>
      </div>
    </section>
  );
}
