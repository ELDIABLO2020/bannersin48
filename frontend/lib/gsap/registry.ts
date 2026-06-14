"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

// Register plugins once (gsap.context and useGSAP handle cleanup)
gsap.registerPlugin(ScrollTrigger, useGSAP);

/** Single source of truth: respect the user's OS motion preference */
export const prefersReducedMotion = (): boolean => {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
};

/**
 * Scroll-triggered animation presets.
 * Ecwid aesthetic: short slide distance (~12-16px), slower durations (0.55-0.7s),
 * subtle ease. Each preset respects prefers-reduced-motion.
 */

export interface RevealOptions {
  /** Element(s) to animate */
  target: gsap.DOMTarget;
  /** ScrollTrigger start (default: "top 85%") */
  start?: string;
  /** Extra duration multiplier for staggered children */
  stagger?: number;
  /** Extra delay before the tween */
  delay?: number;
}

/** Fade + slide up — the primary section reveal (Ecwid: subtle 12px slide) */
export function fadeUpIn(options: RevealOptions): gsap.core.Timeline {
  const reduced = prefersReducedMotion();
  return gsap.timeline({
    scrollTrigger: {
      trigger: options.target as Element,
      start: options.start ?? "top 85%",
      toggleActions: "play none none none",
    },
    delay: options.delay ?? 0,
  }).fromTo(
    options.target,
    reduced ? {} : { opacity: 0, y: 14 },
    { opacity: 1, y: 0, duration: 0.6, ease: "power2.out", stagger: options.stagger ?? 0 },
  );
}

/** Fade only — for subtle reveals */
export function fadeIn(options: RevealOptions): gsap.core.Timeline {
  const reduced = prefersReducedMotion();
  return gsap.timeline({
    scrollTrigger: {
      trigger: options.target as Element,
      start: options.start ?? "top 90%",
      toggleActions: "play none none none",
    },
    delay: options.delay ?? 0,
  }).fromTo(
    options.target,
    reduced ? {} : { opacity: 0 },
    { opacity: 1, duration: 0.55, ease: "power2.out", stagger: options.stagger ?? 0 },
  );
}

/** Slide in from left (Ecwid: subtle 16px slide) */
export function slideInLeft(options: RevealOptions): gsap.core.Timeline {
  const reduced = prefersReducedMotion();
  return gsap.timeline({
    scrollTrigger: {
      trigger: options.target as Element,
      start: options.start ?? "top 85%",
      toggleActions: "play none none none",
    },
    delay: options.delay ?? 0,
  }).fromTo(
    options.target,
    reduced ? {} : { opacity: 0, x: -16 },
    { opacity: 1, x: 0, duration: 0.6, ease: "power2.out", stagger: options.stagger ?? 0 },
  );
}

/** Slide in from right (Ecwid: subtle 16px slide) */
export function slideInRight(options: RevealOptions): gsap.core.Timeline {
  const reduced = prefersReducedMotion();
  return gsap.timeline({
    scrollTrigger: {
      trigger: options.target as Element,
      start: options.start ?? "top 85%",
      toggleActions: "play none none none",
    },
    delay: options.delay ?? 0,
  }).fromTo(
    options.target,
    reduced ? {} : { opacity: 0, x: 16 },
    { opacity: 1, x: 0, duration: 0.6, ease: "power2.out", stagger: options.stagger ?? 0 },
  );
}

export { gsap, ScrollTrigger, useGSAP };
