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

/**
 * Scroll-triggered animation presets.
 * Subtle motion: short slide distance (~12-16px), ~0.55-0.7s durations.
 * Each preset respects prefers-reduced-motion.
 */
export interface RevealOptions {
  /** Element(s) to animate. */
  target: gsap.DOMTarget;
  /** ScrollTrigger start. */
  start?: string;
  /** Stagger delay for grouped children. */
  stagger?: number;
  /** Extra delay before the tween. */
  delay?: number;
  /** Element that owns the ScrollTrigger when target is a child collection. */
  trigger?: Element;
}

function scrollTriggerFor(options: RevealOptions, defaultStart = "top 85%") {
  return {
    trigger: options.trigger ?? (options.target as Element),
    start: options.start ?? defaultStart,
    toggleActions: "play none none none",
  };
}

/** Fade + slide up: the primary section reveal. */
export function fadeUpIn(options: RevealOptions): gsap.core.Timeline {
  const reduced = prefersReducedMotion();
  return gsap.timeline({
    scrollTrigger: scrollTriggerFor(options),
    delay: options.delay ?? 0,
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

/** Fade only: for subtle reveals. */
export function fadeIn(options: RevealOptions): gsap.core.Timeline {
  const reduced = prefersReducedMotion();
  return gsap.timeline({
    scrollTrigger: scrollTriggerFor(options, "top 90%"),
    delay: options.delay ?? 0,
  }).fromTo(
    options.target,
    reduced ? {} : { opacity: 0 },
    {
      opacity: 1,
      duration: reduced ? 0 : 0.55,
      ease: "power2.out",
      stagger: reduced ? 0 : options.stagger ?? 0,
    },
  );
}

/** Slide in from left. */
export function slideInLeft(options: RevealOptions): gsap.core.Timeline {
  const reduced = prefersReducedMotion();
  return gsap.timeline({
    scrollTrigger: scrollTriggerFor(options),
    delay: options.delay ?? 0,
  }).fromTo(
    options.target,
    reduced ? {} : { opacity: 0, x: -16 },
    {
      opacity: 1,
      x: 0,
      duration: reduced ? 0 : 0.6,
      ease: "power2.out",
      stagger: reduced ? 0 : options.stagger ?? 0,
    },
  );
}

/** Slide in from right. */
export function slideInRight(options: RevealOptions): gsap.core.Timeline {
  const reduced = prefersReducedMotion();
  return gsap.timeline({
    scrollTrigger: scrollTriggerFor(options),
    delay: options.delay ?? 0,
  }).fromTo(
    options.target,
    reduced ? {} : { opacity: 0, x: 16 },
    {
      opacity: 1,
      x: 0,
      duration: reduced ? 0 : 0.6,
      ease: "power2.out",
      stagger: reduced ? 0 : options.stagger ?? 0,
    },
  );
}

export { gsap, ScrollTrigger, useGSAP };
