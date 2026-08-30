import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
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
      className="group relative overflow-hidden rounded-card border border-line bg-surface shadow-elev-1 transition-all hover:border-strong-accent hover:shadow-elev-2 motion-safe:hover:-translate-y-1"
    >
      {href && (
        <Link
          href={href}
          data-testid={linkTestId}
          className="absolute inset-0 z-[1] no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-strong-accent focus-visible:ring-offset-2"
          aria-label={label}
        />
      )}
      <div className={cn("relative aspect-video overflow-hidden", mediaClassName)}>
        <PlaceholderImage
          src={image.src}
          alt=""
          fill
          rounded="none"
          sizes={sizes}
          className="transition-transform duration-500 ease-out motion-safe:group-hover:scale-[1.08]"
        />
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-darkest/85 via-darkest/35 to-transparent transition-colors duration-500 group-hover:from-darkest/95"
          aria-hidden
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col justify-end p-md lg:p-lg">
          <Heading className="font-display tracking-tight text-[clamp(20px,2.2vw,32px)] leading-[1.05] text-white uppercase drop-shadow-sm">
            {title}
          </Heading>
          {subtitle && (
            <p className="mt-xs line-clamp-2 text-sm text-white/85 font-body leading-relaxed">
              {subtitle}
            </p>
          )}
          {href && (
            <span className="mt-sm inline-flex items-center gap-xs text-sm font-semibold text-strong-accent font-body">
              {cta}
              <ArrowRight
                className="h-4 w-4 transition-transform duration-300 motion-safe:group-hover:translate-x-1"
                aria-hidden
              />
            </span>
          )}
        </div>
      </div>
      {overlayAction && <div className="absolute top-md right-md z-[2]">{overlayAction}</div>}
      {footer && <div className="relative z-0 p-lg">{footer}</div>}
    </article>
  );
}
