"use client";

import { cn } from "@/lib/utils/cn";
import type { ReactNode } from "react";

export function BuilderShell({
  rail,
  stage,
  price,
  dock,
  className,
}: {
  rail: ReactNode;
  stage: ReactNode;
  price: ReactNode;
  dock: ReactNode;
  className?: string;
}) {
  return (
    <div
      data-testid="builder-shell"
      className={cn(
        "min-h-[calc(100vh-4rem)] bg-navy-base",
        "bg-[radial-gradient(ellipse_at_top,_var(--color-bg-navy-deep)_0%,_var(--color-bg-darkest)_72%)]",
        className,
      )}
    >
      <div className="mx-auto max-w-content px-md lg:px-xl py-md lg:py-lg">
        <div className="grid grid-cols-1 min-[901px]:grid-cols-[7.5rem_minmax(0,1fr)_16rem] gap-md lg:gap-lg min-h-[70vh]">
          {/* Mobile order: price → stage/dock → rail. Desktop: rail | stage/dock | price */}
          <aside className="order-1 min-[901px]:order-3 min-[901px]:self-start min-[901px]:sticky min-[901px]:top-20">
            {price}
          </aside>
          <div className="order-2 min-[901px]:order-2 flex flex-col gap-md min-w-0">
            <div className="flex-1 min-h-[280px]">{stage}</div>
            <div>{dock}</div>
          </div>
          <aside className="order-3 min-[901px]:order-1 min-[901px]:self-start min-[901px]:sticky min-[901px]:top-20">
            {rail}
          </aside>
        </div>
      </div>
    </div>
  );
}
