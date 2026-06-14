"use client";

import { useEffect } from "react";
import { useConfigurator } from "@/lib/stores/configurator";
import {
  POLE_POCKET_PLACEMENT_OPTIONS,
  type PolePocketPlacement,
} from "@bannersin48/shared";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import { Info } from "lucide-react";

export function FinishingStep() {
  const finishing = useConfigurator((s) => s.finishing);
  const setFinishing = useConfigurator((s) => s.setFinishing);
  const togglePolePockets = useConfigurator((s) => s.togglePolePockets);
  const lastMessage = useConfigurator((s) => s.lastFinishingMessage);
  const clearMessage = useConfigurator((s) => s.clearFinishingMessage);

  useEffect(() => {
    if (!lastMessage) return;
    const id = setTimeout(clearMessage, 6000);
    return () => clearTimeout(id);
  }, [lastMessage, clearMessage]);

  const welding = finishing.welding;
  const grommets = finishing.grommets;
  const windSlits = finishing.windSlits;
  const polePockets = finishing.polePockets;

  return (
    <section aria-labelledby="finishing-h">
      <h2 id="finishing-h" className="font-bold text-heading-h4 text-ink mb-md">
        3. Finishing options
      </h2>

      <div className="space-y-md">
        {lastMessage && (
          <div
            role="status"
            className="flex items-start gap-sm p-md rounded-feature bg-warning-bg text-ink"
          >
            <Info className="h-5 w-5 text-warning-fg shrink-0 mt-0.5" aria-hidden />
            <p className="text-sm">{lastMessage}</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-sm">
          <ToggleCard
            title="Welding (welded edges)"
            description="Clean, durable edges. Included."
            checked={welding}
            disabled={polePockets}
            onChange={(v) => setFinishing({ welding: v })}
          />
          <ToggleCard
            title="Grommets"
            description="Metal rings for hanging. Included."
            checked={grommets}
            disabled={polePockets}
            onChange={(v) => setFinishing({ grommets: v })}
          />
          <ToggleCard
            title="Wind slits"
            description="+$0.75 / sq ft. Recommended for very large outdoor banners."
            checked={windSlits}
            onChange={(v) => setFinishing({ windSlits: v })}
          />
          <ToggleCard
            title="Pole pockets"
            description="+$0.50 / sq ft. Requires a different finishing method — grommets &amp; welding are removed."
            checked={polePockets}
            onChange={(v) => togglePolePockets(v, finishing.polePocketPlacement ?? "TOP")}
          />
        </div>

        {polePockets && (
          <Card className="bg-soft-accent">
            <h4 className="font-bold text-sm text-ink mb-sm">Pole pocket placement</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-xs">
              {POLE_POCKET_PLACEMENT_OPTIONS.map((o) => {
                const active = finishing.polePocketPlacement === o.id;
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() =>
                      setFinishing({ polePocketPlacement: o.id as PolePocketPlacement })
                    }
                    className={cn(
                      "rounded-btn border p-sm text-sm text-left font-bold",
                      active
                        ? "bg-surface border-strong-accent text-ink"
                        : "bg-surface border-line text-ink hover:border-strong-accent",
                    )}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
          </Card>
        )}

        {(polePockets || windSlits) && (
          <div className="flex flex-wrap gap-sm">
            {windSlits && <Badge variant="info">+ Wind slits</Badge>}
            {polePacketsBadge(polePockets)}
          </div>
        )}
      </div>
    </section>
  );
}

function polePacketsBadge(visible: boolean) {
  if (!visible) return null;
  return <Badge variant="info">+ Pole pockets (grommets &amp; welding removed)</Badge>;
}

function ToggleCard({
  title,
  description,
  checked,
  disabled,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "text-left transition-all disabled:opacity-50 disabled:cursor-not-allowed",
      )}
    >
      <Card
        className={cn(
          "h-full",
          checked
            ? "bg-soft-accent border border-strong-accent"
            : "hover:border-strong-accent hover:border",
        )}
      >
        <div className="flex items-start justify-between gap-sm">
          <h3 className="font-bold text-body text-ink">{title}</h3>
          <span
            className={cn(
              "inline-flex h-5 w-9 rounded-pill transition-colors shrink-0 mt-0.5",
              checked ? "bg-strong-accent" : "bg-line",
            )}
            aria-hidden
          >
            <span
              className={cn(
                "h-5 w-5 rounded-pill bg-white shadow transition-transform",
                checked ? "translate-x-4" : "translate-x-0",
              )}
            />
          </span>
        </div>
        <p className="text-body-sm text-ink-muted mt-xs">{description}</p>
      </Card>
    </button>
  );
}
