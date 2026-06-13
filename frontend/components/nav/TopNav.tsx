"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, Menu, X } from "lucide-react";
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

export function TopNav() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);

  return (
    <header className="desktop-nav sticky top-0 z-sticky bg-surface border-b border-line shadow-nav">
      <div className="mx-auto max-w-content flex items-center h-16 px-md lg:px-2xl">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-xs no-underline mr-xl" aria-label="Banners In 48 home">
          <span className="font-display text-xl font-bold uppercase tracking-tight text-ink">Banners In</span>
          <span className="rounded-sm bg-cta px-xs font-display text-xl font-bold text-cta-fg">48</span>
        </Link>

        {/* Center links */}
        <nav className="hidden lg:flex items-center gap-xs flex-1">
          {CENTER_LINKS.map((l) => (
            <div key={l.href} className="relative">
              {l.label === "Banners" ? (
                <button
                  type="button"
                  onMouseEnter={() => setTemplatesOpen(true)}
                  onMouseLeave={() => setTemplatesOpen(false)}
                  onFocus={() => setTemplatesOpen(true)}
                  className={cn(
                    "inline-flex items-center gap-1 px-md py-sm text-body text-ink no-underline rounded-btn",
                    "hover:bg-info-tint hover:text-link",
                  )}
                >
                  {l.label}
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              ) : (
                <Link
                  href={l.href}
                  className={cn(
                    "inline-flex items-center gap-1 px-md py-sm text-body text-ink no-underline rounded-btn",
                    "hover:bg-info-tint hover:text-link",
                  )}
                >
                  {l.label}
                </Link>
              )}

              {l.label === "Banners" && templatesOpen && (
                <div
                  onMouseEnter={() => setTemplatesOpen(true)}
                  onMouseLeave={() => setTemplatesOpen(false)}
                  className="absolute top-full left-0 mt-1 w-56 bg-surface rounded-btn shadow-elev-3 border border-line py-sm z-dropdown"
                >
                  {USE_CASES.map((s) => (
                    <Link
                      key={s.label}
                      href={s.href}
                      className="flex items-center justify-between gap-xs px-md py-sm text-body text-ink no-underline hover:bg-info-tint hover:text-link"
                    >
                      <span>{s.label}</span>
                    </Link>
                  ))}
                  <p className="px-md pt-xs text-xs text-ink-muted border-t border-line mt-xs">
                    Use-case quick starts
                  </p>
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* Right side */}
        <div className="hidden lg:flex items-center gap-sm ml-auto">
          <Link
            href="/orders/lookup"
            className="text-link text-body px-md py-sm hover:underline"
          >
            Track Order
          </Link>
          <Link href="/login">
            <Button variant="secondary" size="md">Log In</Button>
          </Link>
          <Link href="/order/vinyl">
            <Button variant="cta" size="md">Order a Banner</Button>
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          className="ml-auto lg:hidden p-sm"
          onClick={() => setMobileOpen((s) => !s)}
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-line bg-surface shadow-elev-2">
          <nav className="px-md py-md flex flex-col gap-xs">
            {CENTER_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="flex items-center justify-between px-md py-sm text-body text-ink hover:bg-info-tint rounded-btn"
                onClick={() => setMobileOpen(false)}
              >
                {l.label}
              </Link>
            ))}
            <div className="border-t border-line my-sm" />
            <Link
              href="/orders/lookup"
              className="px-md py-sm text-link"
              onClick={() => setMobileOpen(false)}
            >
              Track Order
            </Link>
            <Link href="/login" onClick={() => setMobileOpen(false)}>
              <Button variant="secondary" size="block" className="w-full">
                Log In
              </Button>
            </Link>
            <Link href="/order/vinyl" onClick={() => setMobileOpen(false)}>
              <Button variant="cta" size="block" className="w-full">
                Order a Banner
              </Button>
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
