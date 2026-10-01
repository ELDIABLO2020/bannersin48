"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

export interface AccountSection {
  href: string;
  label: string;
  /** One line under the section title. */
  intro: string;
}

/** The account area's sections, in nav order (plan §4.3). */
export const ACCOUNT_SECTIONS: ReadonlyArray<AccountSection> = [
  { href: "/account", label: "Overview", intro: "Your orders, rewards and account details in one place." },
  { href: "/account/orders", label: "Orders", intro: "Track a delivery, open an order, or send the same banner to print again." },
  { href: "/account/designs", label: "Saved designs", intro: "Configurations you kept. Order one again at today's price, rename it, or remove it." },
  { href: "/account/artwork", label: "Artwork", intro: "Files you have uploaded, ready to pick in the builder. Folders keep them organized." },
  { href: "/account/rewards", label: "Rewards", intro: "$1 of credit for every $100 you spend, credited when payment is confirmed." },
  { href: "/account/profile", label: "Profile", intro: "The name and phone number we use on your orders." },
  { href: "/account/addresses", label: "Addresses", intro: "Shipping addresses to pick from at checkout." },
  { href: "/account/security", label: "Security", intro: "Password, email and the devices signed in to this account." },
  { href: "/account/settings", label: "Settings", intro: "Which emails you want from us." },
];

export function activeSection(pathname: string): AccountSection {
  const match = ACCOUNT_SECTIONS.filter((s) => (s.href === "/account" ? pathname === "/account" : pathname === s.href || pathname.startsWith(`${s.href}/`)));
  return match[0] ?? ACCOUNT_SECTIONS[0]!;
}

/** Left rail on `lg+`, a horizontally scrolling tab strip below (no page-level overflow). */
export function AccountNav() {
  const pathname = usePathname() ?? "/account";
  const current = activeSection(pathname);
  return (
    <nav aria-label="Account sections" className="-mx-md px-md lg:mx-0 lg:px-0">
      <ul className="flex gap-xs overflow-x-auto pb-xs lg:flex-col lg:overflow-visible lg:pb-0 [scrollbar-width:thin]">
        {ACCOUNT_SECTIONS.map((section) => {
          const active = section.href === current.href;
          return (
            <li key={section.href} className="shrink-0">
              <Link
                href={section.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-11 items-center whitespace-nowrap rounded-btn px-md py-sm text-body-sm font-bold font-body no-underline",
                  "border border-transparent hover:bg-soft-accent hover:text-link",
                  active ? "bg-surface text-link border-line" : "text-ink",
                )}
              >
                {section.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
