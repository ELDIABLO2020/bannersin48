"use client";

import { useCutoffCountdown } from "@/lib/hooks/useCutoffCountdown";

/**
 * The 48-hour schedule as a measured track, like the ruler in the builder:
 * tonight's cutoff (live), production, and the delivery day it leads to.
 */
export function ProductionTimeline() {
  const { padded, deliveryDow } = useCutoffCountdown();

  const stops = [
    {
      title: "Order by 9:00 PM ET",
      detail: "Submit your order and artwork before tonight's cutoff.",
    },
    {
      title: "We print and finish",
      detail: "Production starts once staff confirm your payment.",
    },
    {
      title: `At your door ${deliveryDow ?? "in 48 business hours"}`,
      detail: "FedEx delivery by 12:00 PM, anywhere in the US.",
    },
  ];

  return (
    <section className="rounded-card bg-darkest text-white overflow-hidden" aria-labelledby="timeline-h">
      <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] lg:items-stretch">
        <div className="px-lg py-lg lg:px-xl lg:py-xl lg:border-r border-b lg:border-b-0 border-white/15">
          <h2 id="timeline-h" className="font-body text-body-sm font-semibold text-white/70">
            Time left to make tonight&rsquo;s cutoff
          </h2>
          <p
            aria-live="off"
            className="mt-xs font-display text-[56px] leading-none tabular-nums text-strong-accent-on-dark"
          >
            {padded ?? "-- : -- : --"}
          </p>
        </div>

        <div className="relative">
          {/* Ruler track: a tick every eighth, a taller one at each stop. */}
          <div
            aria-hidden
            className="hidden sm:block absolute inset-x-0 top-0 h-3 bg-[repeating-linear-gradient(to_right,rgba(255,255,255,0.35)_0,rgba(255,255,255,0.35)_1px,transparent_1px,transparent_calc(100%/24))]"
          />
          <ol className="grid grid-cols-1 sm:grid-cols-3 h-full">
          {stops.map((stop, i) => (
            <li
              key={stop.title}
              className="relative px-lg py-lg lg:py-xl sm:border-l border-white/15 first:border-l-0 border-t sm:border-t-0 first:border-t-0"
            >
              <span aria-hidden className="hidden sm:block absolute left-0 top-0 h-6 w-px bg-white" />
              <p className="font-display text-heading-h3 sm:mt-md">
                <span className="text-white/50 tabular-nums mr-sm">{i + 1}</span>
                {stop.title}
              </p>
              <p className="mt-xs text-body-sm text-white/70 max-w-[34ch]">{stop.detail}</p>
            </li>
          ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
