"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

// Register plugins once. gsap.context and useGSAP handle cleanup.
gsap.registerPlugin(ScrollTrigger, useGSAP);

/** Single source of truth: respect the user's OS motion preference. */
export const prefersReducedMotion = (): boolean => {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
};

interface RevealOptions {
  /** Element(s) to animate. */
  target: gsap.DOMTarget;
  /** Stagger delay for grouped children. */
  stagger?: number;
  /** Element that owns the ScrollTrigger when target is a child collection. */
  trigger?: Element;
}

/** Scroll-triggered fade + slide up (~14px, 0.6s). Respects prefers-reduced-motion. */
export function fadeUpIn(options: RevealOptions): gsap.core.Timeline {
  const reduced = prefersReducedMotion();
  return gsap.timeline({
    scrollTrigger: {
      trigger: options.trigger ?? (options.target as Element),
      start: "top 85%",
      toggleActions: "play none none none",
    },
  }).fromTo(
    options.target,
    reduced ? {} : { opacity: 0, y: 14 },
    {
      opacity: 1,
      y: 0,
      duration: reduced ? 0 : 0.6,
      ease: "power2.out",
      stagger: reduced ? 0 : options.stagger ?? 0,
    },
  );
}

export { gsap, useGSAP };
