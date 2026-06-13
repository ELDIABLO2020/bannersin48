"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useConfigurator } from "@/lib/stores/configurator";
import { getApiClient } from "@/lib/api/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatUsd } from "@/lib/utils/format";
import { formatCountdown } from "@/lib/utils/time";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/stores/cart";
import { Clock, ShoppingCart } from "lucide-react";

export function PriceSummary() {
  const product = useConfigurator((s) => s.product);
  const material = useConfigurator((s) => s.material);
  const size = useConfigurator((s) => s.size);
  const finishing = useConfigurator((s) => s.finishing);
  const quantity = useConfigurator((s) => s.quantity);
  const artworkId = useConfigurator((s) => s.artworkId);
  const addLine = useCart((s) => s.addLine);
  const router = useRouter();

  // Debounce quote calls (250ms)
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

  if (!data || !cutoff) {
    return (
      <Card className="bg-surface sticky top-20">
        <p className="text-body-sm text-ink-muted">Calculating&hellip;</p>
      </Card>
    );
  }

  const eligible = data.eligible;
  const cutoffTs = new Date(cutoff.cutoffAtEt).getTime();
  const { padded } = formatCountdown(cutoffTs - now);

  function handleAdd() {
    if (!data) return;
    const line = data.lines[0];
    if (!line) return;
    addLine({
      id: `cart_${Date.now()}`,
      product,
      material,
      dimensions: size,
      finishing,
      quantity,
      artworkId: artworkId ?? undefined,
      unitProduct: line.unitProduct,
      addons: line.addons,
      productSubtotal: line.productSubtotal,
      shipping: line.shipping,
      totalBeforeTax: line.totalBeforeTax,
      billableSqFt: line.billableSqFt,
      billableDims: line.billableDims,
      display: {
        requestedLabel: `${size.widthFt}' ${size.widthIn}" × ${size.heightFt}' ${size.heightIn}"`,
        billableLabel: `${line.billableDims.widthFt}' × ${line.billableDims.heightFt}'`,
      },
    });
    router.push("/cart");
  }

  return (
    <Card className="bg-surface sticky top-20">
      <p className="text-sm text-ink-muted">Live price</p>
      <p className="text-3xl font-bold text-ink mt-xs tabular-nums">
        {formatUsd(data.total)}
        {isFetching && <span className="ml-2 text-body-sm text-ink-muted">updating&hellip;</span>}
      </p>
      <dl className="mt-md text-sm space-y-xs">
        <Row label="Product" value={formatUsd(data.subtotal)} />
        <Row label={`Shipping (${quantity} × $10)`} value={formatUsd(data.shipping)} />
        <div className="border-t border-line my-sm" />
        <Row label="Total before tax" value={formatUsd(data.total)} bold />
      </dl>

      <div className="mt-lg p-md rounded-feature bg-surface-tint text-center">
        <p className="text-xs uppercase tracking-widest text-ink-muted">Order within</p>
        <p className="font-display text-2xl font-bold tabular-nums leading-none mt-xs">{padded}</p>
        <p className="text-body-sm text-ink mt-sm flex items-center justify-center gap-xs">
          <Clock className="h-3.5 w-3.5" aria-hidden />
          Cutoff <strong className="text-ink">9:00 PM ET</strong>
        </p>
        <p className="text-body-sm text-cta font-bold mt-xs">
          Delivery by {cutoff.guaranteedDeliveryDow} at 12:00 PM
        </p>
      </div>

      <Button
        type="button"
        variant="cta"
        size="block"
        className="mt-lg w-full"
        onClick={handleAdd}
        disabled={!eligible}
      >
        <ShoppingCart className="mr-sm h-5 w-5" aria-hidden />
        Add to cart
      </Button>
      {!eligible && (
        <p className="mt-sm text-sm text-danger text-center">
          This size exceeds the 10&prime; maximum.
        </p>
      )}
    </Card>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "font-bold text-ink" : "text-ink-muted"}`}>
      <dt>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}
