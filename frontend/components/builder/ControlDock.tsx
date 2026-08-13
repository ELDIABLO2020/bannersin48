"use client";

import { useState } from "react";
import { useConfigurator, type DockPanel } from "@/lib/stores/configurator";
import { getControlEligibility, visibleTiles, type BuilderControl } from "./builderRules";
import { SizePanel } from "./SizePanel";
import { GrommetEditor } from "./GrommetEditor";
import {
  POLE_POCKET_PLACEMENT_OPTIONS,
  POLE_POCKET_DEPTH_OPTIONS,
  ROPE_PLACEMENT_OPTIONS,
  PRODUCTS,
  WEBBING_HELP,
  POCKET_DIAMETER_HELP,
} from "@bannersin48/shared";
import { cn } from "@/lib/utils/cn";
import {
  Image as ImageIcon,
  Ruler,
  Layers,
  FlipHorizontal2,
  Flame,
  CircleDot,
  Anchor,
  Wind,
  Link2,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { isDoubleSided, materialForPrintSides } from "./builderRules";

const TILES: Array<{
  id: Exclude<DockPanel, null>;
  control: BuilderControl;
  label: string;
  icon: typeof ImageIcon;
}> = [
  { id: "images", control: "images", label: "Images", icon: ImageIcon },
  { id: "size", control: "size", label: "Size", icon: Ruler },
  { id: "material", control: "material", label: "Material", icon: Layers },
  { id: "sides", control: "sides", label: "Print sides", icon: FlipHorizontal2 },
  { id: "welding", control: "welding", label: "Welding", icon: Flame },
  { id: "webbing", control: "webbing", label: "Webbing", icon: Link2 },
  { id: "rope", control: "rope", label: "Rope", icon: Anchor },
  { id: "grommets", control: "grommets", label: "Grommets", icon: CircleDot },
  { id: "pockets", control: "pockets", label: "Pole pockets", icon: Layers },
  { id: "wind", control: "wind", label: "Wind slits", icon: Wind },
];

export function ControlDock() {
  const productId = useConfigurator((s) => s.productId);
  const material = useConfigurator((s) => s.material);
  const size = useConfigurator((s) => s.size);
  const finishing = useConfigurator((s) => s.finishing);
  const quantity = useConfigurator((s) => s.quantity);
  const setQuantity = useConfigurator((s) => s.setQuantity);
  const setMaterial = useConfigurator((s) => s.setMaterial);
  const setFinishing = useConfigurator((s) => s.setFinishing);
  const togglePolePockets = useConfigurator((s) => s.togglePolePockets);
  const activeDockPanel = useConfigurator((s) => s.activeDockPanel);
  const setActiveDockPanel = useConfigurator((s) => s.setActiveDockPanel);
  const setPickerOpen = useConfigurator((s) => s.setPickerOpen);
  const mobileDockOpen = useConfigurator((s) => s.mobileDockOpen);
  const setMobileDockOpen = useConfigurator((s) => s.setMobileDockOpen);
  const lastMessage = useConfigurator((s) => s.lastFinishingMessage);
  const [eligibilityHint, setEligibilityHint] = useState<string | null>(null);
  const config = PRODUCTS[productId];
  const shown = visibleTiles(productId);

  function openPanel(id: Exclude<DockPanel, null>) {
    if (id === "images") {
      setPickerOpen(true);
      setActiveDockPanel(null);
      setEligibilityHint(null);
      return;
    }
    setEligibilityHint(null);
    setActiveDockPanel(activeDockPanel === id ? null : id);
  }

  return (
    <div data-testid="control-dock" className="rounded-feature border border-line bg-surface overflow-hidden">
      {/* Mobile show-options toggle */}
      <div className="min-[901px]:hidden border-b border-line">
        <button
          type="button"
          data-testid="show-options"
          className="w-full flex items-center justify-between px-md py-sm text-sm font-bold text-ink"
          onClick={() => setMobileDockOpen(!mobileDockOpen)}
        >
          <span>{mobileDockOpen ? "Hide options" : "+ Show options"}</span>
          {mobileDockOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </button>
      </div>

      <div className={cn("min-[901px]:block", mobileDockOpen ? "block" : "hidden")}>
        {lastMessage && (
          <p
            role="status"
            data-testid="finishing-message"
            className="px-md py-sm text-sm bg-warning-bg text-ink border-b border-line"
          >
            {lastMessage}
          </p>
        )}

        <div className="flex gap-1 overflow-x-auto p-sm border-b border-line">
          {TILES.filter((tile) => shown.includes(tile.control)).map((tile) => {
            const eligibility = getControlEligibility(tile.control, { productId, material, size, finishing });
            const Icon = tile.icon;
            const active = activeDockPanel === tile.id;
            const hardDisabled = !eligibility.enabled;
            return (
              <button
                key={tile.id}
                type="button"
                data-testid={`dock-${tile.id}`}
                title={eligibility.reason}
                onClick={() => {
                  if (hardDisabled) {
                    setEligibilityHint(eligibility.reason ?? "This option is unavailable for the current configuration.");
                    setActiveDockPanel(null);
                    return;
                  }
                  openPanel(tile.id);
                }}
                className={cn(
                  "shrink-0 flex flex-col items-center gap-1 rounded-card px-3 py-2 text-[11px] font-bold min-w-[4.5rem] transition-colors",
                  active ? "bg-soft-accent text-strong-accent" : "text-ink-muted hover:bg-surface-tint hover:text-ink",
                  hardDisabled ? "opacity-40 cursor-help" : "",
                )}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {tile.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-sm px-md py-sm border-b border-line">
          <span className="text-sm text-ink">Qty</span>
          <button
            type="button"
            data-testid="qty-minus"
            className="h-8 w-8 border border-line rounded-btn"
            onClick={() => setQuantity(quantity - 1)}
          >
            −
          </button>
          <span data-testid="qty-value" className="tabular-nums font-bold w-6 text-center">{quantity}</span>
          <button
            type="button"
            data-testid="qty-plus"
            className="h-8 w-8 border border-line rounded-btn"
            onClick={() => setQuantity(quantity + 1)}
          >
            +
          </button>
        </div>

        {eligibilityHint && (
          <p
            role="status"
            data-testid="dock-eligibility-hint"
            className="px-md py-sm text-sm bg-warning-bg text-ink border-b border-line"
          >
            {eligibilityHint}
          </p>
        )}

        {activeDockPanel && (
          <div
            data-testid={`dock-panel-${activeDockPanel}`}
            className="max-h-[min(40vh,22rem)] overflow-y-auto p-md border-t border-line animate-in fade-in"
          >
            {activeDockPanel === "size" && <SizePanel />}
            {activeDockPanel === "material" && (
              <div className="space-y-sm">
                <p className="text-sm font-bold text-ink">Material</p>
                {config.materials
                  .filter((id) => id !== "VINYL_18OZ_DOUBLE")
                  .map((id) => {
                    const label =
                      id === "VINYL_13OZ_SINGLE"
                        ? "13 oz"
                        : id === "VINYL_15OZ_SINGLE"
                          ? "15 oz"
                          : id === "VINYL_18OZ_SINGLE"
                            ? "18 oz"
                            : id;
                    return (
                  <button
                    key={id}
                    type="button"
                    data-testid={`material-${id}`}
                    onClick={() => {
                      if (isDoubleSided(material) && id === "VINYL_18OZ_SINGLE") {
                        setMaterial("VINYL_18OZ_DOUBLE");
                      } else {
                        setMaterial(id);
                      }
                    }}
                    className={cn(
                      "w-full text-left rounded-card border px-md py-sm text-sm",
                      material === id || (id === "VINYL_18OZ_SINGLE" && material === "VINYL_18OZ_DOUBLE")
                        ? "border-strong-accent bg-soft-accent"
                        : "border-line",
                    )}
                  >
                    <span className="font-bold">{label}</span>
                    <span className="text-ink-muted ml-2">${config.ratePerSqFt(id).toFixed(2)}/sq ft</span>
                  </button>
                    );
                  })}
              </div>
            )}
            {activeDockPanel === "sides" && (
              <div className="space-y-sm">
                <p className="text-sm font-bold text-ink">Print sides</p>
                {getControlEligibility("sides", { productId, material, size, finishing }).reason && (
                  <p className="text-sm text-ink-muted">{getControlEligibility("sides", { productId, material, size, finishing }).reason}</p>
                )}
                <div className="flex gap-sm">
                  <Toggle
                    label="Single"
                    active={!isDoubleSided(material)}
                    onClick={() => setMaterial(materialForPrintSides(material, false))}
                    testId="sides-single"
                  />
                  <Toggle
                    label="Double"
                    active={isDoubleSided(material)}
                    disabled={!getControlEligibility("sides", { productId, material, size, finishing }).enabled}
                    onClick={() => setMaterial(materialForPrintSides(material, true))}
                    testId="sides-double"
                  />
                </div>
              </div>
            )}
            {activeDockPanel === "welding" && (
              <div className="space-y-sm">
                <p className="text-sm font-bold text-ink">Welding</p>
                <Toggle
                  label={finishing.welding ? "On" : "Off"}
                  active={finishing.welding}
                  disabled={finishing.polePockets}
                  onClick={() => setFinishing({ welding: !finishing.welding })}
                  testId="welding-toggle"
                />
              </div>
            )}
            {activeDockPanel === "webbing" && (
              <div className="space-y-sm">
                <p className="text-sm font-bold text-ink">Webbing</p>
                <Toggle
                  label={finishing.webbing ? "On" : "Off"}
                  active={Boolean(finishing.webbing)}
                  onClick={() => setFinishing({ webbing: !finishing.webbing })}
                  testId="webbing-toggle"
                />
                {finishing.webbing && <p className="text-sm text-ink-muted">{WEBBING_HELP}</p>}
              </div>
            )}
            {activeDockPanel === "rope" && (
              <div className="space-y-sm">
                <p className="text-sm font-bold text-ink">Rope</p>
                {finishing.grommets && !finishing.rope && (
                  <p className="text-sm text-ink-muted">Turning on rope will remove grommets.</p>
                )}
                <Toggle
                  label={finishing.rope ? "On" : "Off"}
                  active={finishing.rope}
                  onClick={() => setFinishing({ rope: !finishing.rope })}
                  testId="rope-toggle"
                />
                {finishing.rope && (
                  <div className="flex flex-wrap gap-sm">
                    {ROPE_PLACEMENT_OPTIONS.map((opt) => (
                      <Toggle
                        key={opt.id}
                        label={opt.label}
                        active={finishing.ropePlacement === opt.id}
                        onClick={() => setFinishing({ ropePlacement: opt.id })}
                        testId={`rope-${opt.id}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
            {activeDockPanel === "grommets" && <GrommetEditor />}
            {activeDockPanel === "pockets" && (
              <div className="space-y-sm">
                <p className="text-sm font-bold text-ink">Pole pockets</p>
                <Toggle
                  label={finishing.polePockets ? "On" : "Off"}
                  active={finishing.polePockets}
                  onClick={() => togglePolePockets(!finishing.polePockets, finishing.polePocketPlacement ?? "TOP", finishing.polePocketDepthIn ?? 2)}
                  testId="pockets-toggle"
                />
                {finishing.polePockets && (
                  <>
                    <p className="text-sm text-ink-muted">{POCKET_DIAMETER_HELP}</p>
                    <p className="text-xs font-bold uppercase tracking-wide text-ink-muted mt-sm">Depth</p>
                    <div className="flex flex-wrap gap-sm">
                      {POLE_POCKET_DEPTH_OPTIONS.map((opt) => (
                        <Toggle
                          key={opt.id}
                          label={opt.label}
                          active={finishing.polePocketDepthIn === opt.id}
                          onClick={() => setFinishing({ polePocketDepthIn: opt.id })}
                          testId={`pocket-depth-${opt.id}`}
                        />
                      ))}
                    </div>
                    <p className="text-xs font-bold uppercase tracking-wide text-ink-muted mt-sm">Placement</p>
                    <div className="flex flex-wrap gap-sm">
                      {POLE_POCKET_PLACEMENT_OPTIONS.map((opt) => (
                        <Toggle
                          key={opt.id}
                          label={opt.label}
                          active={finishing.polePocketPlacement === opt.id}
                          onClick={() => setFinishing({ polePocketPlacement: opt.id })}
                          testId={`pocket-place-${opt.id}`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
            {activeDockPanel === "wind" && (
              <div className="space-y-sm">
                <p className="text-sm font-bold text-ink">Wind slits</p>
                {getControlEligibility("wind", { productId, material, size, finishing }).reason && (
                  <p className="text-sm text-ink-muted">{getControlEligibility("wind", { productId, material, size, finishing }).reason}</p>
                )}
                <Toggle
                  label={finishing.windSlits ? "On" : "Off"}
                  active={finishing.windSlits}
                  disabled={!getControlEligibility("wind", { productId, material, size, finishing }).enabled}
                  onClick={() => setFinishing({ windSlits: !finishing.windSlits })}
                  testId="wind-toggle"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Toggle({
  label,
  active,
  onClick,
  disabled,
  testId,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  testId?: string;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "rounded-card border px-md py-sm text-sm font-bold transition-colors",
        active ? "border-strong-accent bg-soft-accent text-ink" : "border-line text-ink-muted",
        disabled && "opacity-40 cursor-not-allowed",
      )}
    >
      {label}
    </button>
  );
}
