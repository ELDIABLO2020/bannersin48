"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Package, PenTool, LayoutGrid, User } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const TABS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/orders", label: "Orders", icon: Package },
  { href: "/order/artwork", label: "Artwork", icon: PenTool },
  { href: "/sizes", label: "Sizes", icon: LayoutGrid },
  { href: "/dashboard", label: "Account", icon: User },
] as const;

export function BottomTabBar() {
  const pathname = usePathname();
  return (
    <nav
      className="mobile-tab-bar fixed bottom-0 inset-x-0 bg-surface border-t z-tab-bar"
      style={{ borderTopColor: "var(--color-border)" }}
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
                  active ? "text-strong-accent" : "text-ink-muted hover:text-ink",
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="h-6 w-6" strokeWidth={2} aria-hidden />
                <span className="text-[11px] mt-xs font-bold leading-none">{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
