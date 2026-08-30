"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart, cartTotals, canCheckout, configOf } from "@/lib/stores/cart";
import { requoteLine, retryLine, revertLine, revalidateQuotes } from "@/lib/cart/requote";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatUsd } from "@/lib/utils/format";
import { ChevronRight, ShoppingBag } from "lucide-react";
import { CartLineRow } from "@/components/cart/CartLineRow";

export default function CartPage() {
  const lines = useCart((s) => s.lines);
  const removeLine = useCart((s) => s.removeLine);
  const router = useRouter();

  // Revalidate expired quotes when the cart page loads (P0-01 / Wave 3).
  useEffect(() => {
    void revalidateQuotes();
  }, []);

  const totals = cartTotals(lines);
  const checkoutReady = canCheckout(lines);

  if (lines.length === 0) {
    return (
      <div className="bg-surface-tint min-h-[60vh] flex items-center justify-center p-md">
        <div className="bg-surface rounded-card p-3xl text-center max-w-md">
          <ShoppingBag className="h-10 w-10 text-ink-muted mx-auto mb-md" aria-hidden />
          <h1 className="font-display text-section-h2 text-ink leading-section-h2">Your cart is empty</h1>
          <p className="text-body text-ink-muted mt-md">
            Build a banner in under 3 minutes and it will show up here.
          </p>
          <Link href="/order">
            <Button variant="cta" size="lg" className="mt-xl">Start an order</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface-tint min-h-[60vh]">
      <div className="mx-auto max-w-content px-md lg:px-2xl py-xl">
        <nav className="text-body-sm text-ink-muted mb-md" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-link no-underline">Home</Link>
          <ChevronRight className="inline h-3 w-3 mx-1" aria-hidden />
          <span aria-current="page">Cart</span>
        </nav>
        <h1 className="font-display text-section-h2 text-ink leading-section-h2 mb-md">
          Your cart
        </h1>
        <p className="text-body text-ink-muted mb-2xl">
          Review your configuration. Prices are quoted by the server and refresh
          automatically if a quote expires. We&rsquo;ll save it while you sign in at checkout.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-xl">
          <div className="lg:col-span-8 space-y-md">
            {lines.map((l) => (
              <CartLineRow
                key={l.id}
                line={l}
                onRemove={removeLine}
                onUpdateQty={(id, quantity) => {
                  const line = lines.find((ln) => ln.id === id);
                  if (line) void requoteLine(id, { ...configOf(line), quantity });
                }}
                onRetry={(id) => void retryLine(id)}
                onRevert={(id) => revertLine(id)}
              />
            ))}
          </div>

          <div className="lg:col-span-4">
            <Card className="bg-surface sticky top-20">
              <h2 className="font-bold text-heading-h4 text-ink mb-md">Order summary</h2>
              <dl className="text-sm space-y-xs">
                <Row label="Subtotal" value={formatUsd(totals.subtotal)} />
                <Row label="Shipping" value={formatUsd(totals.shipping)} />
                <Row label="Tax" value={formatUsd(totals.tax)} />
                <div className="border-t border-line my-sm" />
                <Row label="Total" value={`${formatUsd(totals.total)} USD`} bold />
              </dl>
              {!checkoutReady && (
                <p className="text-body-sm text-ink-muted mt-sm" role="status">
                  Updating prices — checkout unlocks once every line has a confirmed quote.
                </p>
              )}
              <Button
                variant="cta"
                size="block"
                className="w-full mt-lg"
                disabled={!checkoutReady}
                onClick={() => router.push("/checkout")}
              >
                {checkoutReady ? "Proceed to checkout" : "Updating price…"}
              </Button>
              <Link
                href="/order"
                className="block text-center mt-md text-body-sm text-link hover:underline"
              >
                Add another banner
              </Link>
            </Card>
          </div>
        </div>
      </div>
    </div>
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
