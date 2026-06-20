"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Truck } from "lucide-react";
import { getApiClient } from "@/lib/api/client";
import { formatCountdown } from "@/lib/utils/time";
import { getNextCutoffFallback } from "@/lib/utils/countdown-fallback";

export function AnnouncementStrip() {
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

  const remainingMs = useMemo(() => {
    if (now === null) return 0;
    if (apiData) return apiData.cutoffInMs;
    return getNextCutoffFallback(new Date(now)).remainingMs;
  }, [apiData, now]);

  const { padded: countdownPadded } =
    now === null ? { padded: "-- : -- : --" } : formatCountdown(remainingMs);

  return (
    <div className="bg-darkest text-white text-sm">
      <div className="mx-auto max-w-content px-md lg:px-2xl h-9 flex items-center justify-center gap-md">
        <Truck className="h-4 w-4 text-strong-accent" aria-hidden />
        <p className="text-center font-medium">
          <span className="hidden sm:inline">Order by 9:00 PM ET &rarr; delivered by noon in 48 business hours. US & Canada.</span>
          <span className="sm:hidden">48-hr delivery. US & Canada.</span>
        </p>
        <span
          aria-live="polite"
          className="hidden md:inline-flex items-center gap-1 px-sm py-xs rounded-pill bg-strong-accent text-strong-accent-text tabular-nums text-xs font-bold"
        >
          {countdownPadded}
        </span>
      </div>
    </div>
  );
}
