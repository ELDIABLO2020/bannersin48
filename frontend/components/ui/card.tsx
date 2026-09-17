import * as React from "react";
import { cn } from "@/lib/utils/cn";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("bg-surface text-ink border border-line-subtle rounded-card shadow-elev-1 p-lg", className)}
      {...props}
    />
  );
}
