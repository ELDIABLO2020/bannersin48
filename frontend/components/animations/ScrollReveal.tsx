"use client";

import type { ReactNode, RefObject } from "react";
import { useRef } from "react";
import {
  fadeIn,
  fadeUpIn,
  gsap,
  prefersReducedMotion,
  slideInLeft,
  slideInRight,
  useGSAP,
} from "@/lib/gsap/registry";

type RevealPreset = "fade-up" | "fade" | "slide-left" | "slide-right";

type ScrollRevealProps = {
  children: ReactNode;
  className?: string;
  as?: "div" | "ol";
  preset?: RevealPreset;
  selector?: string;
  start?: string;
  stagger?: number;
  delay?: number;
};

export function ScrollReveal({
  children,
  className,
  as: Component = "div",
  preset = "fade-up",
  selector = ":scope > *",
  start,
  stagger = 0.08,
  delay,
}: ScrollRevealProps) {
  const scope = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const root = scope.current;
      if (!root) return;

      const targets = selector
        ? gsap.utils.toArray<HTMLElement>(selector, root)
        : [root];

      if (targets.length === 0) return;

      if (prefersReducedMotion()) {
        gsap.set(targets, { clearProps: "opacity,transform" });
        return;
      }

      const options = {
        target: targets,
        trigger: root,
        start,
        stagger,
        delay,
      };

      switch (preset) {
        case "fade":
          fadeIn(options);
          break;
        case "slide-left":
          slideInLeft(options);
          break;
        case "slide-right":
          slideInRight(options);
          break;
        case "fade-up":
        default:
          fadeUpIn(options);
          break;
      }
    },
    { scope },
  );

  if (Component === "ol") {
    return (
      <ol ref={scope as RefObject<HTMLOListElement>} className={className} data-gsap-reveal>
        {children}
      </ol>
    );
  }

  return (
    <div ref={scope as RefObject<HTMLDivElement>} className={className} data-gsap-reveal>
      {children}
    </div>
  );
}
