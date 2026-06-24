"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShoppingBag, X } from "lucide-react";
import { useCart, cartTotals } from "@/lib/stores/cart";
import { useCartDrawer } from "@/lib/stores/cart-drawer";
import { Button } from "@/components/ui/button";
import { formatUsd } from "@/lib/utils/format";
import { CartLineRow } from "./CartLineRow";

const ANIMATION_MS = 300;

export function CartDrawer() {
  const isOpen = useCartDrawer((s) => s.isOpen);
  const close = useCartDrawer((s) => s.close);
  const lines = useCart((s) => s.lines);
  const removeLine = useCart((s) => s.removeLine);
  const updateLine = useCart((s) => s.updateLine);
  const router = useRouter();

  const [mounted, setMounted] = useState(false); // portal target ready
  const [render, setRender] = useState(false); // panel mounted for close animation
  const [reducedMotion, setReducedMotion] = useState(false);

  const panelRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const titleId = useId();

  // SSR-safe portal mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Reduced-motion preference
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Mount panel for animation, lock scroll, trap focus
  useEffect(() => {
    if (isOpen) {
      setRender(true);
      previouslyFocused.current = document.activeElement as HTMLElement | null;
      document.body.style.overflow = "hidden";
      // Focus close button after paint
      const t = setTimeout(() => closeBtnRef.current?.focus(), 0);
      return () => clearTimeout(t);
    }
    // Closing — give the panel time to slide out unless reduced motion
    if (!reducedMotion) {
      const t = setTimeout(() => setRender(false), ANIMATION_MS);
      return () => clearTimeout(t);
    }
    setRender(false);
  }, [isOpen, reducedMotion]);

  // Cleanup body scroll lock on unmount
  useEffect(() => {
    return () => {
      document.body.style.overflow = "";
      previouslyFocused.current?.focus?.();
    };
  }, []);

  // Esc to close + focus trap
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }
      if (e.key === "Tab" && panelRef.current) {
        const focusables = panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, close]);

  if (!mounted || !render) return null;

  const totals = cartTotals(lines);
  const count = lines.reduce((acc, l) => acc + l.quantity, 0);
  const transitionClass = reducedMotion ? "" : "transition-transform duration-300 ease-out";

  function goToCheckout() {
    close();
    router.push("/checkout");
  }

  return createPortal(
    <div aria-hidden={!isOpen}>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/40 ${reducedMotion ? "" : "transition-opacity duration-300"}`}
        style={{ zIndex: "var(--z-modal-backdrop)", opacity: isOpen ? 1 : 0 }}
        onClick={close}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`fixed right-0 top-0 h-full w-full max-w-md bg-surface shadow-elev-2 flex flex-col ${transitionClass}`}
        style={{
          zIndex: "var(--z-modal)",
          transform: isOpen ? "translateX(0)" : "translateX(100%)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-lg py-md border-b border-line">
          <div>
            <h2 id={titleId} className="font-display text-heading-h2 text-ink leading-none">
              Your cart
            </h2>
            <p className="text-body-sm text-ink-muted mt-xs">
              {count === 0 ? "No items yet" : `${count} item${count === 1 ? "" : "s"}`}
            </p>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={close}
            aria-label="Close cart"
            className="p-sm rounded-btn text-ink-muted hover:bg-soft-accent hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-strong-accent"
          >
            <X className="h-6 w-6" aria-hidden />
          </button>
        </div>

        {/* Body */}
        {lines.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-xl text-center">
            <div>
              <ShoppingBag className="h-10 w-10 text-ink-muted mx-auto mb-md" aria-hidden />
              <p className="font-display text-heading-h3 text-ink">Your cart is empty</p>
              <p className="text-body text-ink-muted mt-sm">
                Build a banner in under 3 minutes and it will show up here.
              </p>
              <Link href="/order/vinyl" onClick={close}>
                <Button variant="cta" size="lg" className="mt-lg">Start an order</Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-lg py-md space-y-md">
            {lines.map((l) => (
              <div key={l.id} className="border border-line rounded-card p-md">
                <CartLineRow
                  line={l}
                  bare
                  onRemove={removeLine}
                  onUpdateQty={(id, quantity) => updateLine(id, { quantity })}
                />
              </div>
            ))}
            <Link
              href="/cart"
              onClick={close}
              className="block text-center text-body-sm text-link hover:underline pt-xs"
            >
              View full cart
            </Link>
          </div>
        )}

        {/* Footer */}
        {lines.length > 0 && (
          <div className="border-t border-line px-lg py-md bg-surface">
            <dl className="text-sm space-y-xs">
              <div className="flex justify-between text-ink-muted">
                <dt>Subtotal</dt>
                <dd className="tabular-nums">{formatUsd(totals.subtotal)}</dd>
              </div>
              <div className="flex justify-between text-ink-muted">
                <dt>Shipping</dt>
                <dd className="tabular-nums">{formatUsd(totals.shipping)}</dd>
              </div>
              <div className="border-t border-line my-sm" />
              <div className="flex justify-between font-bold text-ink">
                <dt>Total before tax</dt>
                <dd className="tabular-nums">{formatUsd(totals.total)}</dd>
              </div>
            </dl>
            <Button
              type="button"
              variant="cta"
              size="block"
              className="w-full mt-md"
              onClick={goToCheckout}
            >
              Checkout · {formatUsd(totals.total)}
            </Button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
