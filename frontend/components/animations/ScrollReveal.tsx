"use client";

import type { ReactNode, RefObject } from "react";
import { useRef } from "react";
import { fadeUpIn, gsap, prefersReducedMotion, useGSAP } from "@/lib/gsap/registry";

type ScrollRevealProps = {
  children: ReactNode;
  className?: string;
  as?: "div" | "ol";
  selector?: string;
};

export function ScrollReveal({
  children,
  className,
  as: Component = "div",
  selector = ":scope > *",
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

      fadeUpIn({ target: targets, trigger: root, stagger: 0.08 });
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
