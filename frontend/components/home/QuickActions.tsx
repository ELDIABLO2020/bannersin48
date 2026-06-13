"use client";

import { useRef } from "react";
import Link from "next/link";
import { Upload, PenTool, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useGSAP } from "@gsap/react";
import { fadeUpIn } from "@/lib/gsap/registry";

const ACTIONS = [
  {
    href: "/order/artwork",
    icon: Upload,
    label: "Upload Artwork",
    description: "PDF, JPG, or JPEG",
  },
  {
    href: "/design",
    icon: PenTool,
    label: "Design Online",
    description: "Build a banner in your browser",
    soon: true,
  },
  {
    href: "/design?tool=ai",
    icon: Sparkles,
    label: "AI Helper",
    description: "Generate from a prompt",
    soon: true,
  },
] as const;

export function QuickActions() {
  const sectionRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!sectionRef.current) return;
      fadeUpIn({
        target: sectionRef.current.querySelectorAll(".qa-card"),
        stagger: 0.1,
      });
    },
    { scope: sectionRef },
  );

  return (
    <section ref={sectionRef} className="bg-surface" aria-label="Quick start options">
      <div className="mx-auto max-w-content px-md lg:px-2xl py-2xl">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-md">
          {ACTIONS.map((a) => {
            const Icon = a.icon;
            return (
              <Link
                key={a.href}
                href={a.href}
                className="qa-card block no-underline"
                aria-label={a.label}
              >
                <Card variant="feature" className="hover:shadow-elev-3 transition-shadow h-full">
                  <div className="flex items-start gap-md">
                    <div
                      className="rounded-pill p-md shrink-0"
                      style={{ backgroundColor: "var(--color-bg-info-tint)" }}
                    >
                      <Icon className="h-6 w-6 text-link" aria-hidden />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-xs">
                        <h3 className="font-bold text-heading-h4 text-ink leading-tight">
                          {a.label}
                        </h3>
                        {"soon" in a && a.soon && <Badge variant="warning">SOON</Badge>}
                      </div>
                      <p className="text-sm text-ink-muted mt-xs">{a.description}</p>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
