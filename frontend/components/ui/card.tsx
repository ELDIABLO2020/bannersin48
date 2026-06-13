import * as React from "react";
import { cn } from "@/lib/utils/cn";

type CardVariant = "default" | "feature" | "dark" | "info";

const variantClasses: Record<CardVariant, string> = {
  default: "bg-surface text-ink border border-line rounded-card shadow-elev-1 p-lg",
  feature: "bg-surface text-ink rounded-feature shadow-elev-2 p-xl",
  dark: "bg-navy-base text-white p-3xl rounded-none",
  info: "bg-info-tint text-ink rounded-feature p-lg",
};

export function Card({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { variant?: CardVariant }) {
  return <div className={cn(variantClasses[variant], className)} {...props} />;
}
