"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { priceLine, MATERIAL_RATES, type Quantity } from "@bannersin48/shared";
import { useConfigurator } from "@/lib/stores/configurator";
import { getApiClient } from "@/lib/api/client";
import { useCart } from "@/lib/stores/cart";
import { useCartDrawer } from "@/lib/stores/cart-drawer";
import { formatUsd } from "@/lib/utils/format";
import { formatCountdown } from "@/lib/utils/time";
import { Button } from "@/components/ui/button";
import { Clock, ShoppingCart } from "lucide-react";
import { materialLabel } from "./builderRules";

export function PriceHero() {
  const product = useConfigurator((s) => s.product);
  const signs = useConfigurator((s) => s.signs);
  const material = useConfigurator((s) => s.material);
  const size = useConfigurator((s) => s.size);
  const finishing = useConfigurator((s) => s.finishing);
  const quantity = useConfigurator((s) => s.quantity);
  const addLine = useCart((s) => s.addLine);
  const openDrawer = useCartDrawer((s) => s.open);

  const optimistic = useMemo(
    () =>
      priceLine({
        material,
        dimensions: size,
        finishing,
        quantity: Math.max(1, Math.min(10, quantity)) as Quantity,
      }),
    [material, size, finishing, quantity],
  );

  const [debounced, setDebounced] = useState({ material, size, finishing, quantity });
  useEffect(() => {
    const id = setTimeout(() => setDebounced({ material, size, finishing, quantity }), 250);
    return () => clearTimeout(id);
  }, [material, size, finishing, quantity]);

  const { data, isFetching } = useQuery({
    queryKey: ["quote", debounced],
    queryFn: () =>
      getApiClient().quote({
        material: debounced.material,
        dimensions: debounced.size,
        finishing: debounced.finishing,
        quantity: debounced.quantity,
      }),
    enabled: !(product === "retractable" && debounced.size.widthFt === 0),
  });

  const { data: cutoff } = useQuery({
    queryKey: ["next-cutoff"],
    queryFn: () => getApiClient().getNextCutoff(),
    refetchInterval: 60_000,
  });

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const displayTotal = data?.total ?? optimistic.totalBeforeTax;
  const eligible = data?.eligible ?? optimistic.eligible;
  const cutoffTs = cutoff ? new Date(cutoff.cutoffAtEt).getTime() : 0;
  const { padded } = cutoff ? formatCountdown(cutoffTs - now) : { padded: "--:--:--" };

  const [adding, setAdding] = useState(false);

  async function handleAddAll() {
    setAdding(true);
    try {
      for (const sign of signs) {
        const quote = await getApiClient().quote({
          material: sign.material,
          dimensions: sign.size,
          finishing: sign.finishing,
          quantity: sign.quantity,
        });
        const line = quote.lines[0];
        if (!line || !quote.eligible) continue;
        addLine({
          id: `cart_${Date.now()}_${sign.id}`,
          product: "vinyl",
          material: sign.material,
          dimensions: sign.size,
          finishing: sign.finishing,
          quantity: sign.quantity,
          artworkId: sign.artworkId ?? undefined,
          unitProduct: line.unitProduct,
          addons: line.addons,
          productSubtotal: line.productSubtotal,
          shipping: line.shipping,
          totalBeforeTax: line.totalBeforeTax,
          billableSqFt: line.billableSqFt,
          billableDims: line.billableDims,
          display: {
            requestedLabel: `${sign.size.widthFt}' ${sign.size.widthIn}" × ${sign.size.heightFt}' ${sign.size.heightIn}"`,
            billableLabel: `${line.billableDims.widthFt}' × ${line.billableDims.heightFt}'`,
          },
        });
      }
      openDrawer();
    } finally {
      setAdding(false);
    }
  }

  return (
    <div data-testid="price-hero" className="rounded-feature border border-line bg-surface p-md shadow-sm">
      <p className="text-xs uppercase tracking-widest text-ink-muted">Live price</p>
      <p
        data-testid="price-total"
        className="font-display text-3xl font-bold text-ink mt-xs tabular-nums transition-opacity duration-200"
      >
        {formatUsd(displayTotal)}
        {isFetching && <span className="ml-2 text-body-sm text-ink-muted font-body font-normal">updating…</span>}
      </p>
      <p className="text-body-sm text-ink-muted mt-xs">
        {(data?.lines[0]?.billableSqFt ?? optimistic.billableSqFt)} sq ft · {materialLabel(material)}
      </p>

      {cutoff && (
        <div className="mt-md p-sm rounded-card bg-soft-accent text-center">
          <p className="text-[10px] uppercase tracking-widest text-ink-muted">Order within</p>
          <p className="font-display text-xl font-bold tabular-nums text-strong-accent leading-none mt-1">{padded}</p>
          <p className="text-xs text-ink mt-sm flex items-center justify-center gap-1">
            <Clock className="h-3 w-3" aria-hidden />
            Delivery by {cutoff.guaranteedDeliveryDow} noon
          </p>
        </div>
      )}

      {/* Rate matrix — desktop only (≥901px) */}
      <div data-testid="rate-matrix" className="mt-md hidden min-[901px]:block text-[11px] text-ink-muted space-y-0.5">
        <p className="font-bold text-ink uppercase tracking-wide text-[10px] mb-1">Rates / sq ft</p>
        <Row label="13 oz" value={`$${MATERIAL_RATES.VINYL_13OZ_SINGLE.toFixed(2)}`} />
        <Row label="15 oz" value={`$${MATERIAL_RATES.VINYL_15OZ_SINGLE.toFixed(2)}`} />
        <Row label="18 oz" value={`$${MATERIAL_RATES.VINYL_18OZ_SINGLE.toFixed(2)}`} />
        <Row label="18 oz DS" value={`$${MATERIAL_RATES.VINYL_18OZ_DOUBLE.toFixed(2)}`} />
      </div>

      <Button
        type="button"
        variant="cta"
        size="block"
        className="mt-md w-full"
        data-testid="add-to-cart"
        onClick={handleAddAll}
        disabled={!eligible || adding}
      >
        <ShoppingCart className="mr-sm h-5 w-5" aria-hidden />
        {signs.length > 1 ? `Add ${signs.length} signs to cart` : "Add to cart"}
      </Button>
      {!eligible && (
        <p className="mt-sm text-sm text-danger text-center">This size exceeds the 10′ maximum.</p>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span>{label}</span>
      <span className="tabular-nums text-ink">{value}</span>
    </div>
  );
}
