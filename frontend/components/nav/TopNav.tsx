"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ArrowRight, ChevronDown, Menu, X } from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

const CENTER_LINKS: ReadonlyArray<{ href: string; label: string }> = [
  { href: "/order/vinyl", label: "Banners" },
  { href: "/sizes", label: "Sizes & Pricing" },
  { href: "/order/retractable", label: "Retractable" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/help", label: "Help Center" },
];

const USE_CASES: ReadonlyArray<{ href: string; label: string }> = [
  { href: "/order/vinyl?use=business", label: "Business" },
  { href: "/order/vinyl?use=restaurant", label: "Restaurant" },
  { href: "/order/vinyl?use=contractor", label: "Contractor" },
  { href: "/order/vinyl?use=school", label: "School & Sports" },
  { href: "/order/vinyl?use=events", label: "Events" },
  { href: "/order/vinyl?use=real-estate", label: "Real Estate" },
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
  const [templatesOpen, setTemplatesOpen] = useState(false);

  return (
    <header className="desktop-nav sticky top-0 z-sticky bg-surface border-b border-line shadow-nav" aria-label="Banners In 48 home">
      <div className="mx-auto max-w-content flex items-center h-16 px-md lg:px-2xl">
        <BrandLogo className="mr-xl" priority />

        <nav className="hidden lg:flex items-center gap-xs flex-1">
          {CENTER_LINKS.map((l) => (
            <div key={l.href} className="relative">
              {l.label === "Banners" ? (
                <button
                  type="button"
                  onMouseEnter={() => setTemplatesOpen(true)}
                  onMouseLeave={() => setTemplatesOpen(false)}
                  onFocus={() => setTemplatesOpen(true)}
                  className={navLinkClass(pathname.startsWith("/order/vinyl"))}
                >
                  {l.label}
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              ) : (
                <Link href={l.href} className={navLinkClass(pathname === l.href || pathname.startsWith(`${l.href}/`))}>
                  {l.label}
                </Link>
              )}

              {l.label === "Banners" && templatesOpen && (
                <div
                  onMouseEnter={() => setTemplatesOpen(true)}
                  onMouseLeave={() => setTemplatesOpen(false)}
                  className="absolute top-full left-0 mt-1 w-56 bg-surface rounded-card shadow-elev-2 border border-line py-sm z-dropdown"
                >
                  {USE_CASES.map((s) => (
                    <Link
                      key={s.label}
                      href={s.href}
                      className="flex items-center justify-between gap-xs px-md py-sm text-body text-ink no-underline hover:bg-soft-accent hover:text-link font-body"
                    >
                      <span>{s.label}</span>
                    </Link>
                  ))}
                  <p className="px-md pt-xs text-xs text-ink-muted border-t border-line mt-xs font-body">
                    Use-case quick starts
                  </p>
                </div>
              )}
            </div>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-sm ml-auto">
          <Link
            href="/orders/lookup"
            className="text-link text-body px-md py-sm hover:underline font-medium font-body"
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
            <Link href="/order/vinyl" className="shrink-0">
              <Button variant="cta-attached" size="attached" className="h-11 sm:h-11 px-md text-sm sm:text-sm">
                Order now
                <ArrowRight className="ml-xs h-4 w-4" aria-hidden />
              </Button>
            </Link>
          </div>
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
                className="flex items-center justify-between px-md py-sm text-body text-ink hover:bg-soft-accent rounded-btn font-body"
                onClick={() => setMobileOpen(false)}
              >
                {l.label}
              </Link>
            ))}
            <div className="border-t border-line my-sm" />
            <Link
              href="/orders/lookup"
              className="px-md py-sm text-link font-body"
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
              <Link href="/order/vinyl" onClick={() => setMobileOpen(false)} className="shrink-0">
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
