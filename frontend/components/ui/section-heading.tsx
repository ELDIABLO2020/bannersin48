import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/** The one section-title treatment for storefront pages: display face, optional one-line intro. */
export function SectionHeading({
  id,
  title,
  intro,
  onDark = false,
  level = "section",
  className,
}: {
  id?: string;
  title: ReactNode;
  intro?: ReactNode;
  onDark?: boolean;
  /** "section" for homepage bands; "sub" for sections inside a titled page. */
  level?: "section" | "sub";
  className?: string;
}) {
  return (
    <div className={cn("max-w-2xl", className)}>
      <h2
        id={id}
        className={cn(
          "font-display",
          level === "section" ? "text-[clamp(32px,4.5vw,48px)] leading-[1.08]" : "text-heading-h2",
          onDark ? "text-white" : "text-ink",
        )}
      >
        {title}
      </h2>
      {intro && (
        <p className={cn("mt-sm text-body font-body", onDark ? "text-white/75" : "text-ink-muted")}>{intro}</p>
      )}
    </div>
  );
}
