"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { LayoutGrid, Menu, ShoppingCart, User } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useCart } from "@/lib/stores/cart";
import { useCartDrawer } from "@/lib/stores/cart-drawer";
import { MobileMenuDrawer } from "./MobileMenuDrawer";

const TABS = [
  { href: "/sizes", label: "Sizes", icon: LayoutGrid },
  { href: "/dashboard", label: "Account", icon: User },
] as const;

export function BottomTabBar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const lineCount = useCart((s) => s.lines.reduce((n, l) => n + l.quantity, 0));
  const toggleDrawer = useCartDrawer((s) => s.toggle);
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  return (
    <>
      <nav
        className="mobile-tab-bar fixed bottom-0 inset-x-0 bg-darkest border-t z-tab-bar"
        style={{ borderTopColor: "var(--color-border-on-dark)", paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="Primary mobile navigation"
      >
        <ul className="grid grid-cols-5 items-end">
          <li>
            <button
              ref={menuButtonRef}
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
              aria-expanded={menuOpen}
              className={cn(
                "relative flex min-h-[56px] w-full flex-col items-center justify-center py-sm",
                menuOpen ? "text-strong-accent-on-dark" : "text-white/70 hover:text-white",
              )}
            >
              <Menu className="h-6 w-6" strokeWidth={2} aria-hidden />
              <span className="mt-xs text-[11px] font-bold leading-none">Menu</span>
            </button>
          </li>

          {TABS.slice(0, 1).map((tab) => {
            const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
            const Icon = tab.icon;
            return (
              <li key={tab.href}>
                <Link
                  href={tab.href}
                  className={cn(
                    "relative flex min-h-[56px] flex-col items-center justify-center py-sm no-underline",
                    active ? "text-strong-accent-on-dark" : "text-white/70 hover:text-white",
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon className="h-6 w-6" strokeWidth={2} aria-hidden />
                  <span className="mt-xs text-[11px] font-bold leading-none">{tab.label}</span>
                </Link>
              </li>
            );
          })}

          {/* Central primary shopping action. */}
          <li className="relative min-h-[56px]">
            <Link
              href="/order"
              aria-label="Order now"
              className="absolute -top-6 left-1/2 flex h-14 w-14 -translate-x-1/2 flex-col items-center justify-center rounded-full bg-strong-accent text-strong-accent-text no-underline shadow-elev-3 ring-4 ring-darkest transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-strong-accent-on-dark"
            >
              <span className="font-display text-lg font-bold uppercase leading-none">Order</span>
            </Link>
          </li>

          {TABS.slice(1).map((tab) => {
            const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
            const Icon = tab.icon;
            return (
              <li key={tab.href}>
                <Link
                  href={tab.href}
                  className={cn(
                    "relative flex min-h-[56px] flex-col items-center justify-center py-sm no-underline",
                    active ? "text-strong-accent-on-dark" : "text-white/70 hover:text-white",
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon className="h-6 w-6" strokeWidth={2} aria-hidden />
                  <span className="mt-xs text-[11px] font-bold leading-none">{tab.label}</span>
                </Link>
              </li>
            );
          })}

          <li>
            <button
              type="button"
              onClick={toggleDrawer}
              aria-label={`Open cart${lineCount > 0 ? `, ${lineCount} item${lineCount === 1 ? "" : "s"}` : ""}`}
              className="relative flex min-h-[56px] w-full flex-col items-center justify-center py-sm text-white/70 hover:text-white"
            >
              <span className="relative">
                <ShoppingCart className="h-6 w-6" strokeWidth={2} aria-hidden />
                {lineCount > 0 && (
                  <span
                    className="absolute -right-2 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-strong-accent px-1 text-[10px] font-bold text-white"
                    aria-hidden="true"
                  >
                    {lineCount}
                  </span>
                )}
              </span>
              <span className="mt-xs text-[11px] font-bold leading-none">Cart</span>
            </button>
          </li>
        </ul>
      </nav>

      <MobileMenuDrawer
        isOpen={menuOpen}
        onClose={closeMenu}
        triggerRef={menuButtonRef}
      />
    </>
  );
}
