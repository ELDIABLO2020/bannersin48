"use client";

import { useConfigurator } from "@/lib/stores/configurator";
import { MAX_QUANTITY_PER_LINE } from "@bannersin48/shared";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Info } from "lucide-react";

export function QuantityStep() {
  const quantity = useConfigurator((s) => s.quantity);
  const setQuantity = useConfigurator((s) => s.setQuantity);

  return (
    <section aria-labelledby="qty-h">
      <h2 id="qty-h" className="font-bold text-heading-h4 text-ink mb-md">
        4. Quantity
      </h2>
      <Card variant="default" className="bg-surface">
        <div className="flex items-center gap-md">
          <Button
            type="button"
            variant="secondary"
            size="md"
            aria-label="Decrease quantity"
            onClick={() => setQuantity(quantity - 1)}
            disabled={quantity <= 1}
          >
            <Minus className="h-4 w-4" aria-hidden />
          </Button>
          <div className="text-center min-w-[80px]">
            <p className="text-3xl font-bold text-ink leading-none tabular-nums">{quantity}</p>
            <p className="text-body-sm text-ink-muted mt-xs">banners</p>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="md"
            aria-label="Increase quantity"
            onClick={() => setQuantity(quantity + 1)}
            disabled={quantity >= MAX_QUANTITY_PER_LINE}
          >
            <Plus className="h-4 w-4" aria-hidden />
          </Button>
          <div className="ml-auto text-right">
            <p className="text-body-sm text-ink-muted">Max {MAX_QUANTITY_PER_LINE} per configuration</p>
          </div>
        </div>
        {quantity >= MAX_QUANTITY_PER_LINE && (
          <p className="mt-md text-sm text-link flex items-center gap-xs">
            <Info className="h-4 w-4" aria-hidden />
            Need more? Add another line item in the cart.
          </p>
        )}
      </Card>
    </section>
  );
}
