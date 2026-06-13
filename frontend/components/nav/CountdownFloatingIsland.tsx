"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getApiClient } from "@/lib/api/client";
import { formatCountdown } from "@/lib/utils/time";

/**
 * Mobile-only floating countdown chip. Hidden on desktop.
 * Updates client-side between refetches of the next-cutoff endpoint.
 */
export function CountdownFloatingIsland() {
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

  if (!data) return null;
  const cutoffTs = new Date(data.cutoffAtEt).getTime();
  const { padded } = formatCountdown(cutoffTs - now);

  return (
    <div
      className="lg:hidden fixed left-1/2 -translate-x-1/2 z-sticky pointer-events-none"
        style={{ bottom: 76 }}
    >
      <div
        className="rounded-card shadow-elev-2 px-md py-sm text-center text-white"
        style={{ backgroundColor: "var(--color-bg-navy-deep)" }}
        aria-live="polite"
      >
        <div className="text-[10px] uppercase tracking-wider text-white/60">Order within</div>
        <div className="font-display text-base font-bold tabular-nums leading-none">{padded}</div>
        <div className="text-[10px] text-white/60">Cutoff {data.guaranteedDeliveryDow} 12:00 PM</div>
      </div>
    </div>
  );
}
