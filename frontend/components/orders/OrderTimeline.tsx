import { ORDER_TIMELINE, ORDER_STATUS_LABELS, type OrderStatus } from "@bannersin48/shared";
import { Check, Circle } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function OrderTimeline({ status }: { status: OrderStatus }) {
  return (
    <ol className="space-y-md">
      {ORDER_TIMELINE.map((step, i) => {
        const done = step.completedBy.includes(status);
        const current = done && (i === ORDER_TIMELINE.length - 1 || !ORDER_TIMELINE[i + 1].completedBy.includes(status));
        return (
          <li key={step.key} className="flex items-start gap-md">
            <span
              className={cn(
                "inline-flex items-center justify-center h-8 w-8 rounded-pill shrink-0",
                done
                  ? "bg-link text-white"
                  : "bg-line text-ink-muted",
                current && "ring-4",
              )}
              style={current ? { boxShadow: "0 0 0 4px var(--color-bg-info-tint)" } : undefined}
              aria-hidden
            >
              {done ? <Check className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
            </span>
            <div className="pt-1">
              <p className={cn("font-bold text-sm", done ? "text-ink" : "text-ink-muted")}>
                {step.label}
              </p>
              {current && (
                <p className="text-body-sm text-link mt-xs">{ORDER_STATUS_LABELS[status]}</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
