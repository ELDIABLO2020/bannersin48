"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { computeNextCutoff } from "@bannersin48/shared";
import { getApiClient } from "@/lib/api/client";
import { formatCountdown } from "@/lib/utils/time";

/**
 * Live countdown to the next 9:00 PM ET cutoff. Uses the API's answer when
 * available and the shared cutoff rules otherwise, ticking every second.
 * `padded` is null until mounted so server and first client render match.
 */
export function useCutoffCountdown(): { padded: string | null; remainingMs: number; deliveryDow: string | null } {
  const { data } = useQuery({
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

  if (now === null) return { padded: null, remainingMs: 0, deliveryDow: null };

  const cutoff = data ?? computeNextCutoff(new Date(now));
  const remainingMs = Math.max(0, new Date(cutoff.cutoffAtEt).getTime() - now);
  return { padded: formatCountdown(remainingMs).padded, remainingMs, deliveryDow: cutoff.guaranteedDeliveryDow };
}
