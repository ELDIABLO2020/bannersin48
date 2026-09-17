"use client";

import { useCutoffCountdown } from "@/lib/hooks/useCutoffCountdown";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface Props {
  variant?: "hero" | "inline";
}

export function CountdownCard({ variant = "hero" }: Props) {
  const { padded, remainingMs, deliveryDow } = useCutoffCountdown();

  // Progress bar: fraction of 24h window elapsed
  const progressPct =
    padded === null
      ? 0
      : Math.max(
          0,
          Math.min(100, ((24 * 60 * 60 * 1000 - remainingMs) / (24 * 60 * 60 * 1000)) * 100),
        );

  return (
    <div
      className={cn(
        "rounded-card text-left text-ink bg-soft-accent",
        variant === "hero" ? "p-3xl" : "p-xl",
      )}
      aria-live="polite"
    >
      <p className="text-xs font-semibold tracking-wide text-ink-muted">Order within</p>
      <p
        className={cn(
          "font-display font-extrabold tabular-nums leading-none mt-xs text-strong-accent tracking-tight",
          variant === "hero" ? "text-[40px] sm:text-[48px]" : "text-2xl",
        )}
      >
        {padded ?? "-- : -- : --"}
      </p>
      <p className="text-sm text-ink-muted mt-sm">
        <Clock className="inline h-3.5 w-3.5 mr-1 -mt-1" aria-hidden />
        Today&rsquo;s cutoff: <span className="text-ink font-bold">9:00 PM ET</span>
      </p>
      <p className="text-sm text-ink mt-md">
        to receive by{" "}
        <span className="text-strong-accent font-bold">{deliveryDow ?? "next delivery"}</span> at{" "}
        <span className="text-strong-accent font-bold">12:00 PM</span>
      </p>
      {/* Progress bar */}
      <div className="mt-lg h-1.5 bg-white/60 rounded-pill overflow-hidden">
        <div
          className="h-full bg-strong-accent transition-all"
          style={{ width: `${progressPct}%` }}
        />
      </div>
    </div>
  );
}
