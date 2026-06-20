"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getApiClient } from "@/lib/api/client";
import { formatCountdown } from "@/lib/utils/time";
import { getNextCutoffFallback } from "@/lib/utils/countdown-fallback";

/**
 * Mobile-only floating countdown chip. Hidden on desktop.
 * Updates client-side between refetches of the next-cutoff endpoint.
 * Falls back to client-side computation when the API is unavailable.
 */
export function CountdownFloatingIsland() {
  const { data: apiData } = useQuery({
    queryKey: ["next-cutoff"],
    queryFn: () => getApiClient().getNextCutoff(),
    refetchInterval: 60_000,
    retry: 1,
  });

  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const cutoffInfo = useMemo(() => {
    if (now === null) {
      return {
        remainingMs: 0,
        deliveryDow: "next delivery",
      };
    }
    if (apiData) {
      return {
        remainingMs: new Date(apiData.cutoffAtEt).getTime() - now,
        deliveryDow: apiData.guaranteedDeliveryDow,
      };
    }
    return getNextCutoffFallback(new Date(now));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiData, now]);

  const { padded } = now === null ? { padded: "-- : -- : --" } : formatCountdown(cutoffInfo.remainingMs);

  return (
    <div
      className="lg:hidden fixed left-1/2 -translate-x-1/2 z-sticky pointer-events-none"
      style={{ bottom: 76 }}
    >
      <div
        className="rounded-card shadow-elev-2 px-md py-sm text-center bg-strong-accent text-strong-accent-text"
        aria-live="polite"
      >
        <div className="text-[10px] uppercase tracking-wider text-strong-accent-text/80">Order within</div>
        <div className="font-display text-base font-bold tabular-nums leading-none">{padded}</div>
        <div className="text-[10px] text-strong-accent-text/80">Cutoff {cutoffInfo.deliveryDow} 12:00 PM</div>
      </div>
    </div>
  );
}
