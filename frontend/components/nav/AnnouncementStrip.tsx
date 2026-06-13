"use client";

import { useQuery } from "@tanstack/react-query";
import { Truck } from "lucide-react";
import { getApiClient } from "@/lib/api/client";
import { formatCountdown } from "@/lib/utils/time";

export function AnnouncementStrip() {
  const { data } = useQuery({
    queryKey: ["next-cutoff"],
    queryFn: () => getApiClient().getNextCutoff(),
    refetchInterval: 60_000,
  });

  const { padded: countdownPadded } = formatCountdown(data?.cutoffInMs ?? 0);

  return (
    <div className="bg-navy-deep text-white text-sm">
      <div className="mx-auto max-w-content px-md lg:px-2xl h-9 flex items-center justify-center gap-md">
        <Truck className="h-4 w-4" aria-hidden />
        <p className="text-center">
          <span className="hidden sm:inline">Order by 9:00 PM ET &rarr; delivered by noon in 48 business hours. US &amp; Canada.</span>
          <span className="sm:hidden">48-hr delivery. US &amp; Canada.</span>
        </p>
        <span
          aria-live="polite"
          className="hidden md:inline-flex items-center gap-1 px-sm py-xs rounded-pill bg-white/10 tabular-nums text-xs font-bold"
        >
          {countdownPadded}
        </span>
      </div>
    </div>
  );
}
