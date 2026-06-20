import * as React from "react";
import { cn } from "@/lib/utils/cn";

type CardVariant = "default" | "feature" | "dark" | "info";

const variantClasses: Record<CardVariant, string> = {
  default: "bg-surface text-ink border border-line-subtle rounded-card shadow-elev-1 p-lg",
  feature: "bg-surface text-ink rounded-card shadow-elev-2 p-xl",
  dark: "bg-darkest text-white p-3xl rounded-card",
  info: "bg-info-tint text-ink rounded-card p-lg",
};

export function Card({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { variant?: CardVariant }) {
  return <div className={cn(variantClasses[variant], className)} {...props} />;
}
