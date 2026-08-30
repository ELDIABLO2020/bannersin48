"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ArrowRight, ChevronDown, Menu, X, ShoppingCart } from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { useCart } from "@/lib/stores/cart";
import { useCartDrawer } from "@/lib/stores/cart-drawer";
import {
  PRODUCTS,
  CATALOG_NAV_PRODUCTS,
  CATALOG_USE_CASES,
  catalogFilterHref,
  productOrderHref,
} from "@bannersin48/shared";

const CENTER_LINKS: ReadonlyArray<{ href: string; label: string }> = [
  { href: "/order", label: "Banners" },
  { href: "/sizes", label: "Sizes & Pricing" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/help", label: "Help Center" },
];

function navLinkClass(active: boolean) {
  return cn(
    "inline-flex items-center gap-1 px-md py-sm text-body text-ink no-underline font-medium font-body border-b-2 border-transparent",
    "hover:bg-soft-accent hover:text-link",
    active && "text-link border-link",
  );
}

export function TopNav() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const lineCount = useCart((s) => s.lines.reduce((n, l) => n + l.quantity, 0));
  const toggleDrawer = useCartDrawer((s) => s.toggle);
  const bannersActive = pathname === "/order" || pathname.startsWith("/order/");

  return (
    <header className="desktop-nav sticky top-0 z-sticky bg-surface border-b border-line shadow-nav" aria-label="Banners In 48 home">
      <div className="mx-auto max-w-hero flex items-center h-16 px-md lg:px-2xl">
        <BrandLogo className="mr-xl" priority />

        <nav className="hidden lg:flex items-center gap-xs flex-1">
          {CENTER_LINKS.map((l) => (
            <div key={l.href} className="relative">
              {l.label === "Banners" ? (
                <div
                  onMouseEnter={() => setCatalogOpen(true)}
                  onMouseLeave={() => setCatalogOpen(false)}
                >
                  <Link
                    href="/order"
                    className={navLinkClass(bannersActive)}
                    onFocus={() => setCatalogOpen(true)}
                  >
                    {l.label}
                    <ChevronDown className="h-3.5 w-3.5" />
                  </Link>
                  {catalogOpen && (
                    <div className="absolute top-full left-0 mt-1 w-[34rem] bg-surface rounded-card shadow-elev-2 border border-line p-md z-dropdown grid grid-cols-2 gap-md">
                      <div>
                        <p className="px-sm pb-xs text-xs font-bold uppercase tracking-wide text-ink-muted font-body">
                          Products
                        </p>
                        {CATALOG_NAV_PRODUCTS.map((id) => (
                          <Link
                            key={id}
                            href={productOrderHref(id)}
                            className="flex items-center justify-between gap-xs px-sm py-xs text-body text-ink no-underline hover:bg-soft-accent hover:text-link font-body"
                          >
                            <span>{PRODUCTS[id].title}</span>
                          </Link>
                        ))}
                        <Link
                          href="/order"
                          className="mt-xs flex items-center gap-xs px-sm py-xs text-sm font-semibold text-link no-underline hover:underline font-body"
                        >
                          All banners
                          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                        </Link>
                      </div>
                      <div>
                        <p className="px-sm pb-xs text-xs font-bold uppercase tracking-wide text-ink-muted font-body">
                          Shop by need
                        </p>
                        {CATALOG_USE_CASES.map((s) => (
                          <Link
                            key={s.id}
                            href={catalogFilterHref(s.id)}
                            className="flex items-center justify-between gap-xs px-sm py-xs text-body text-ink no-underline hover:bg-soft-accent hover:text-link font-body"
                          >
                            <span>{s.label}</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <Link href={l.href} className={navLinkClass(pathname === l.href || pathname.startsWith(`${l.href}/`))}>
                  {l.label}
                </Link>
              )}
            </div>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-sm ml-auto">
          <Link
            href="/orders"
            className="text-link text-body px-md py-sm hover:underline no-underline font-medium font-body"
          >
            Track Order
          </Link>
          <div className="flex items-stretch">
            <Link
              href="/login"
              className={cn(
                "inline-flex items-center justify-center shrink-0 no-underline",
                "h-11 rounded-l-pill rounded-r-none border border-line-input border-r-0 px-md",
                "bg-surface text-ink font-input text-sm font-medium",
                "hover:bg-soft-accent hover:text-link transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-strong-accent focus-visible:ring-offset-2",
              )}
            >
              Log In
            </Link>
            <Link href="/order" className="shrink-0">
              <Button variant="cta-attached" size="attached" className="h-11 sm:h-11 px-md text-sm sm:text-sm">
                Order now
                <ArrowRight className="ml-xs h-4 w-4" aria-hidden />
              </Button>
            </Link>
          </div>
          <button
            type="button"
            onClick={toggleDrawer}
            aria-label={`Open cart${lineCount > 0 ? `, ${lineCount} item${lineCount === 1 ? "" : "s"}` : ""}`}
            className="relative inline-flex items-center justify-center h-11 w-11 rounded-pill text-ink hover:bg-soft-accent hover:text-link transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-strong-accent focus-visible:ring-offset-2"
          >
            <ShoppingCart className="h-5 w-5" aria-hidden />
            {lineCount > 0 && (
              <span
                className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-strong-accent text-white text-xs font-bold flex items-center justify-center"
                aria-hidden="true"
              >
                {lineCount}
              </span>
            )}
          </button>
        </div>

        <button
          type="button"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          className="ml-auto lg:hidden p-sm"
          onClick={() => setMobileOpen((s) => !s)}
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="lg:hidden border-t border-line bg-surface shadow-elev-2">
          <nav className="px-md py-md flex flex-col gap-xs">
            {CENTER_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="flex items-center justify-between px-md py-sm text-body text-ink hover:bg-soft-accent rounded-btn no-underline font-body"
                onClick={() => setMobileOpen(false)}
              >
                {l.label}
              </Link>
            ))}
            <div className="border-t border-line my-sm" />
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                toggleDrawer();
              }}
              className="flex items-center justify-between w-full px-md py-sm text-ink hover:bg-soft-accent rounded-btn font-body"
            >
              <span className="flex items-center gap-sm">
                <ShoppingCart className="h-5 w-5" aria-hidden />
                Cart
              </span>
              {lineCount > 0 && (
                <span className="min-w-[20px] h-5 px-1 rounded-full bg-strong-accent text-white text-xs font-bold flex items-center justify-center">
                  {lineCount}
                </span>
              )}
            </button>
            <Link
              href="/orders"
              className="px-md py-sm text-link no-underline font-body"
              onClick={() => setMobileOpen(false)}
            >
              Track Order
            </Link>
            <div className="flex items-stretch">
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "inline-flex flex-1 items-center justify-center no-underline",
                  "h-12 sm:h-[54px] rounded-l-pill rounded-r-none border border-line-input border-r-0 px-lg",
                  "bg-surface text-ink font-input text-sm sm:text-body font-medium",
                  "hover:bg-soft-accent hover:text-link transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-strong-accent focus-visible:ring-offset-2",
                )}
              >
                Log In
              </Link>
              <Link href="/order" onClick={() => setMobileOpen(false)} className="shrink-0">
                <Button variant="cta-attached" size="attached">
                  Order now
                  <ArrowRight className="ml-sm h-5 w-5" aria-hidden />
                </Button>
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
