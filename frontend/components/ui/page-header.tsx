import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";

/** Links back up the site. The current page is not repeated; its title follows. */
export function Breadcrumbs({
  trail,
  className,
}: {
  trail: ReadonlyArray<{ href: string; label: string }>;
  className?: string;
}) {
  return (
    <nav aria-label="Breadcrumb" className={cn("text-body-sm text-ink-muted font-body", className)}>
      <ol className="flex flex-wrap items-center gap-xs">
        {trail.map((step) => (
          <li key={step.href} className="flex items-center gap-xs">
            <Link href={step.href} className="text-link no-underline hover:underline">
              {step.label}
            </Link>
            <span aria-hidden>/</span>
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** Title block for every inner storefront page: optional trail, display title, one-line intro. */
export function PageHeader({
  title,
  intro,
  trail,
  actions,
  className,
}: {
  title: ReactNode;
  intro?: ReactNode;
  /** Ancestors of this page, nearest last. The current page is not repeated. */
  trail?: ReadonlyArray<{ href: string; label: string }>;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("mb-xl", className)}>
      {trail && trail.length > 0 && <Breadcrumbs trail={trail} className="mb-sm" />}
      <div className="flex flex-col gap-md sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <h1 className="font-display text-[clamp(36px,5vw,48px)] leading-[1.08] text-ink">{title}</h1>
          {intro && <p className="mt-sm text-body text-ink-muted font-body">{intro}</p>}
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>
    </header>
  );
}
