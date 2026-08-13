"use client";

import { useEffect, useState } from "react";
import { useConfigurator } from "@/lib/stores/configurator";
import { COLOR_MATCH_DELAY_MESSAGE } from "@bannersin48/shared";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export function ColorMatchModal() {
  const open = useConfigurator((s) => s.colorMatchOpen);
  const setOpen = useConfigurator((s) => s.setColorMatchOpen);
  const colorMatching = useConfigurator((s) => s.colorMatching);
  const setColorMatching = useConfigurator((s) => s.setColorMatching);
  const flashMessage = useConfigurator((s) => s.flashMessage);
  const [notes, setNotes] = useState(colorMatching?.pmsNotes ?? "");

  useEffect(() => {
    if (open) setNotes(colorMatching?.pmsNotes ?? "");
  }, [open, colorMatching?.pmsNotes]);

  if (!open) return null;

  return (
    <div
      data-testid="color-match-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="color-match-title"
    >
      <div className="w-full max-w-md rounded-feature border border-line bg-surface shadow-lg">
        <div className="flex items-center justify-between border-b border-line px-md py-sm">
          <h2 id="color-match-title" className="font-display text-heading-h4 text-ink">
            PMS color matching
          </h2>
          <button
            type="button"
            aria-label="Close"
            data-testid="color-match-close"
            onClick={() => setOpen(false)}
            className="p-1 text-ink-muted hover:text-ink"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-md space-y-md">
          <p className="text-sm text-ink-muted">
            Enter Pantone (PMS) color references for critical brand colors.
          </p>
          <textarea
            data-testid="color-match-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={5}
            placeholder="e.g. Logo red = PMS 186 C&#10;Background = PMS Cool Gray 3"
            className="w-full rounded-card border border-line px-md py-sm text-sm bg-surface resize-y"
          />
          <p role="note" className="text-sm bg-warning-bg text-ink rounded-card px-md py-sm">
            {COLOR_MATCH_DELAY_MESSAGE}
          </p>
          <div className="flex justify-end gap-sm">
            <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="cta"
              size="sm"
              data-testid="color-match-submit"
              onClick={() => {
                setColorMatching(notes);
                flashMessage(COLOR_MATCH_DELAY_MESSAGE);
                setOpen(false);
              }}
            >
              Submit
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
