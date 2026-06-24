"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Package, ShoppingCart, LayoutGrid, User } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useCart } from "@/lib/stores/cart";
import { useCartDrawer } from "@/lib/stores/cart-drawer";

const TABS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/orders", label: "Orders", icon: Package },
  { href: "/sizes", label: "Sizes", icon: LayoutGrid },
  { href: "/dashboard", label: "Account", icon: User },
] as const;

export function BottomTabBar() {
  const pathname = usePathname();
  const lineCount = useCart((s) => s.lines.reduce((n, l) => n + l.quantity, 0));
  const toggleDrawer = useCartDrawer((s) => s.toggle);

  return (
    <nav
      className="mobile-tab-bar fixed bottom-0 inset-x-0 bg-darkest border-t z-tab-bar"
      style={{ borderTopColor: "var(--color-border-on-dark)" }}
      aria-label="Primary mobile navigation"
    >
      <ul className="grid grid-cols-5">
        {TABS.map((tab) => {
          const active =
            tab.href === "/"
              ? pathname === "/"
              : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          const Icon = tab.icon;
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                className={cn(
                  "flex flex-col items-center justify-center min-h-[56px] py-sm no-underline relative",
                  active ? "text-strong-accent" : "text-white/70 hover:text-white",
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="h-6 w-6" strokeWidth={2} aria-hidden />
                <span className="text-[11px] mt-xs font-bold leading-none">{tab.label}</span>
              </Link>
            </li>
          );
        })}

        {/* Cart tab — opens drawer instead of navigating */}
        <li>
          <button
            type="button"
            onClick={toggleDrawer}
            aria-label={`Open cart${lineCount > 0 ? `, ${lineCount} item${lineCount === 1 ? "" : "s"}` : ""}`}
            className="w-full flex flex-col items-center justify-center min-h-[56px] py-sm relative text-white/70 hover:text-white"
          >
            <span className="relative">
              <ShoppingCart className="h-6 w-6" strokeWidth={2} aria-hidden />
              {lineCount > 0 && (
                <span
                  className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-strong-accent text-white text-[10px] font-bold flex items-center justify-center"
                  aria-hidden="true"
                >
                  {lineCount}
                </span>
              )}
            </span>
            <span className="text-[11px] mt-xs font-bold leading-none">Cart</span>
          </button>
        </li>
      </ul>
    </nav>
  );
}
