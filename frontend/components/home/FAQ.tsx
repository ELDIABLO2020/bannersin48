"use client";

import { useRef, useState, useCallback } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import gsap from "gsap";
import { prefersReducedMotion } from "@/lib/gsap/registry";

const FAQS = [
  {
    q: "When will my banner arrive?",
    a: "By 12:00 PM noon on the guaranteed delivery date — that's 48 business hours after your order and proof approval, anywhere in the US or Canada. FedEx only; we pick the service that meets the guarantee.",
  },
  {
    q: "What if I miss the 9 PM cutoff?",
    a: "Your order rolls into the next cutoff cycle automatically. The countdown on the homepage and configurator always shows the current window so you see the new delivery date in real time.",
  },
  {
    q: "What file types can I upload?",
    a: "PDF, JPG, and JPEG. We print exactly what you upload after proof approval — no manual re-proofing.",
  },
  {
    q: "What if my artwork has a problem?",
    a: "Upload is rejected client-side for unsupported types and oversize files. If we spot a quality issue in the proof stage, the proof step pauses the SLA until the file is fixed. Otherwise the timer doesn't start until you approve.",
  },
  {
    q: "What does the guarantee cover?",
    a: "If we miss the 48-business-hour delivery for reasons on our side, the $10 shipping charge for that banner is refunded automatically. The order total is not affected — just the shipping fee.",
  },
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  const answersRef = useRef<Map<number, HTMLDivElement>>(new Map());

  const toggle = useCallback(
    (i: number) => {
      const nextOpen = open === i ? null : i;
      const reduced = prefersReducedMotion();

      // Animate closing the currently open panel
      if (open !== null && open !== i) {
        const currentAnswer = answersRef.current.get(open);
        if (currentAnswer) {
          gsap.to(currentAnswer, {
            height: 0,
            opacity: 0,
            duration: reduced ? 0 : 0.25,
            ease: "power2.in",
          });
        }
      }

      // Animate opening the new panel
      if (nextOpen !== null && nextOpen !== open) {
        const newAnswer = answersRef.current.get(nextOpen);
        if (newAnswer) {
          // Set height to auto first, then measure
          newAnswer.style.display = "block";
          newAnswer.style.height = "auto";
          const targetHeight = newAnswer.offsetHeight;
          newAnswer.style.height = "0px";
          newAnswer.style.opacity = "0";

          gsap.to(newAnswer, {
            height: targetHeight,
            opacity: 1,
            duration: reduced ? 0 : 0.3,
            ease: "power2.out",
          });
        }
      } else if (nextOpen === null && open !== null) {
        // Closing the currently open panel without opening a new one
        const currentAnswer = answersRef.current.get(open);
        if (currentAnswer) {
          gsap.to(currentAnswer, {
            height: 0,
            opacity: 0,
            duration: reduced ? 0 : 0.25,
            ease: "power2.in",
          });
        }
      }

      setOpen(nextOpen);
    },
    [open],
  );

  return (
    <section className="bg-surface-tint" aria-labelledby="faq-h">
      <div className="mx-auto max-w-content px-md lg:px-2xl py-3xl">
        <div className="text-center mb-2xl">
          <h2 id="faq-h" className="font-display text-section-h2 text-ink leading-section-h2">
            Frequently asked
          </h2>
        </div>
        <ul className="max-w-3xl mx-auto space-y-sm">
          {FAQS.map((f, i) => {
            const isOpen = open === i;
            return (
              <li key={f.q} className="bg-surface rounded-feature border border-line overflow-hidden">
                <button
                  type="button"
                  className="w-full flex items-center justify-between gap-md p-lg text-left"
                  aria-expanded={isOpen}
                  onClick={() => toggle(i)}
                >
                  <span className="font-bold text-body text-ink">{f.q}</span>
                  <ChevronDown
                    className={cn(
                      "h-5 w-5 text-link transition-transform shrink-0",
                      isOpen && "rotate-180",
                    )}
                    aria-hidden
                  />
                </button>
                <div
                  ref={(el) => {
                    if (el) answersRef.current.set(i, el);
                    else answersRef.current.delete(i);
                  }}
                  className="overflow-hidden"
                  style={{
                    height: isOpen ? "auto" : 0,
                    opacity: isOpen ? 1 : 0,
                    display: isOpen ? undefined : "none",
                  }}
                >
                  <div className="px-lg pb-lg text-body text-ink-muted leading-relaxed">
                    {f.a}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
