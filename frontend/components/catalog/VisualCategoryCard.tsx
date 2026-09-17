import type { ReactNode } from "react";
import Link from "next/link";
import { PlaceholderImage } from "@/components/ui/PlaceholderImage";
import { cn } from "@/lib/utils/cn";
import type { PlaceholderAsset } from "@/content/placeholders";

export function VisualCategoryCard({
  href,
  title,
  subtitle,
  image,
  cta = "Order",
  headingLevel = "h3",
  overlayAction,
  footer,
  testId,
  linkTestId,
  ariaLabel,
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
  mediaClassName,
}: {
  href?: string;
  title: string;
  subtitle?: string;
  image: PlaceholderAsset;
  cta?: string;
  headingLevel?: "h2" | "h3";
  overlayAction?: ReactNode;
  footer?: ReactNode;
  testId?: string;
  linkTestId?: string;
  ariaLabel?: string;
  sizes?: string;
  mediaClassName?: string;
}) {
  const Heading = headingLevel;
  const label = ariaLabel ?? (href ? `${cta} ${title}` : undefined);

  return (
    <article
      data-testid={testId}
      className="group relative overflow-hidden rounded-card border border-line bg-surface transition-colors hover:border-strong-accent focus-within:border-strong-accent"
    >
      {href && (
        <Link
          href={href}
          data-testid={linkTestId}
          className="absolute inset-0 z-[1] no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-strong-accent focus-visible:ring-offset-2"
          aria-label={label}
        />
      )}
      <div className={cn("relative aspect-[3/2] overflow-hidden bg-surface-tint", mediaClassName)}>
        <PlaceholderImage src={image.src} alt="" fill rounded="none" sizes={sizes} />
      </div>
      <div className="p-md">
        <Heading className="font-display text-heading-h3 text-ink">{title}</Heading>
        {subtitle && <p className="mt-xs text-body-sm text-ink-muted font-body">{subtitle}</p>}
        {href && (
          <p className="mt-sm text-body-sm font-bold text-link font-body group-hover:underline" aria-hidden>
            {cta}
          </p>
        )}
      </div>
      {overlayAction && <div className="absolute top-md right-md z-[2]">{overlayAction}</div>}
      {footer && <div className="relative z-0 p-lg">{footer}</div>}
    </article>
  );
}
