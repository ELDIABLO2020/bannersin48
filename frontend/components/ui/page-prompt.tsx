import type { ReactNode } from "react";

/** A whole-page message with its next step: empty cart, signed out, not found. */
export function PagePrompt({ title, detail, children }: { title: string; detail?: ReactNode; children: ReactNode }) {
  return (
    <div className="bg-surface-tint min-h-[60vh]">
      <div className="mx-auto max-w-content px-md lg:px-2xl py-2xl sm:py-3xl">
        <div className="max-w-xl">
          <h1 className="font-display text-[clamp(36px,5vw,48px)] leading-[1.08] text-ink">{title}</h1>
          {detail && <p className="mt-sm text-body text-ink-muted">{detail}</p>}
          <div className="mt-xl flex flex-col gap-sm sm:flex-row sm:flex-wrap [&_button]:w-full sm:[&_button]:w-auto">{children}</div>
        </div>
      </div>
    </div>
  );
}
