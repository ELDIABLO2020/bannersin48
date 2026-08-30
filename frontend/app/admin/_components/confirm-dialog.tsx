"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
}

/**
 * Shared accessible confirmation dialog for admin destructive/state-changing
 * actions. Replaces the browser `window.confirm` so that every dangerous
 * action gets focus entry/trap, an accessible name/description, Escape, and
 * focus return — and so the mutation itself still flows through the backend
 * audit trail rather than an unrecorded UI affordance.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  busy = false,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent hideClose>
        <DialogTitle>{title}</DialogTitle>
        {description != null && <DialogDescription className="mt-sm">{description}</DialogDescription>}
        <div className="mt-xl flex justify-end gap-sm">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={cn(
              destructive && "bg-danger text-white hover:bg-danger/90 active:bg-danger",
            )}
          >
            {busy ? "Working…" : confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
