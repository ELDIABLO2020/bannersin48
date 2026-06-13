"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getApiClient } from "@/lib/api/client";
import { formatCountdown } from "@/lib/utils/time";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface Props {
  variant?: "hero" | "inline";
}

export function CountdownCard({ variant = "hero" }: Props) {
  const { data } = useQuery({
    queryKey: ["next-cutoff"],
    queryFn: () => getApiClient().getNextCutoff(),
    refetchInterval: 60_000,
  });

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!data) {
    return (
      <div
        className={cn(
          "rounded-card text-center text-white animate-pulse-slow",
          variant === "hero" ? "p-3xl" : "p-xl",
        )}
        style={{ backgroundColor: "var(--color-bg-navy-deep)" }}
      >
        <div className="text-xs uppercase tracking-widest text-white/60">Loading&hellip;</div>
        <div className="font-display text-2xl font-bold tabular-nums">-- : -- : --</div>
      </div>
    );
  }

  const cutoffTs = new Date(data.cutoffAtEt).getTime();
  const { padded, hours, minutes } = formatCountdown(cutoffTs - now);
  const totalMin = hours * 60 + minutes;
  const totalWindow = 24 * 60; // 24h window in minutes
  const progressPct = Math.max(0, Math.min(100, ((totalWindow - totalMin) / totalWindow) * 100));

  return (
    <div
      className={cn(
        "rounded-card text-center text-white",
        variant === "hero" ? "p-3xl" : "p-xl",
      )}
      style={{ backgroundColor: "var(--color-bg-navy-deep)" }}
      aria-live="polite"
    >
      <p className="text-xs uppercase tracking-widest text-white/60">Order within</p>
      <p
        className={cn(
          "font-display font-bold tabular-nums leading-none mt-sm",
          variant === "hero" ? "text-[40px] sm:text-[48px]" : "text-2xl",
        )}
      >
        {padded}
      </p>
      <p className="text-sm text-white/60 mt-sm">
        <Clock className="inline h-3.5 w-3.5 mr-1 -mt-1" aria-hidden />
        Today&rsquo;s cutoff: <span className="text-white font-bold">9:00 PM ET</span>
      </p>
      <p className="text-sm text-white mt-md">
        to receive by{" "}
        <span className="text-cta font-bold">{data.guaranteedDeliveryDow}</span> at{" "}
        <span className="text-cta font-bold">12:00 PM</span>
      </p>
      {/* Progress bar */}
      <div className="mt-lg h-1 bg-white/10 rounded-pill overflow-hidden">
        <div
          className="h-full bg-link transition-all"
          style={{ width: `${progressPct}%` }}
        />
      </div>
    </div>
  );
}
