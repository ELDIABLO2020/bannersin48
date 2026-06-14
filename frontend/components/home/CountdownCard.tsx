"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getApiClient } from "@/lib/api/client";
import { formatCountdown } from "@/lib/utils/time";
import { getNextCutoffFallback } from "@/lib/utils/countdown-fallback";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface Props {
  variant?: "hero" | "inline";
}

export function CountdownCard({ variant = "hero" }: Props) {
  const { data: apiData } = useQuery({
    queryKey: ["next-cutoff"],
    queryFn: () => getApiClient().getNextCutoff(),
    refetchInterval: 60_000,
    // Don't retry endlessly — the fallback handles missing API gracefully
    retry: 1,
  });

  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Use API data when available, otherwise compute client-side fallback
  const cutoffInfo = useMemo(() => {
    if (now === null) {
      return {
        cutoffAtMs: 0,
        remainingMs: 0,
        deliveryDow: "next delivery",
      };
    }
    if (apiData) {
      return {
        cutoffAtMs: new Date(apiData.cutoffAtEt).getTime(),
        remainingMs: new Date(apiData.cutoffAtEt).getTime() - now,
        deliveryDow: apiData.guaranteedDeliveryDow,
      };
    }
    return getNextCutoffFallback(new Date(now));
    // We intentionally re-run the fallback every second via `now` to keep remainingMs fresh
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiData, now]);

  const { padded } = now === null ? { padded: "-- : -- : --" } : formatCountdown(cutoffInfo.remainingMs);

  // Progress bar: fraction of 24h window elapsed
  const progressPct =
    now === null
      ? 0
      : Math.max(
          0,
          Math.min(100, ((24 * 60 * 60 * 1000 - cutoffInfo.remainingMs) / (24 * 60 * 60 * 1000)) * 100),
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
        {padded}
      </p>
      <p className="text-sm text-ink-muted mt-sm">
        <Clock className="inline h-3.5 w-3.5 mr-1 -mt-1" aria-hidden />
        Today&rsquo;s cutoff: <span className="text-ink font-bold">9:00 PM ET</span>
      </p>
      <p className="text-sm text-ink mt-md">
        to receive by{" "}
        <span className="text-strong-accent font-bold">{cutoffInfo.deliveryDow}</span> at{" "}
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
