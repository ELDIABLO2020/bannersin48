"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/**
 * Shared Radix dialog primitives. Using these (instead of hand-rolled modals)
 * gives every dialog consistent focus entry, focus trap, Escape, outside-click
 * policy, focus return, inert background, and scroll restoration for free.
 */
export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogPortal = DialogPrimitive.Portal;
export const DialogClose = DialogPrimitive.Close;

export const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-modal-backdrop bg-ink/50 data-[state=open]:animate-fade-in",
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = "DialogOverlay";

interface DialogContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  /** Visually hidden accessible label; defaults to a close control's name. */
  title?: string;
  /** Optional accessible description. */
  description?: string;
  /** Hide the built-in close button when the caller provides its own. */
  hideClose?: boolean;
}

export const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(({ className, children, title, description, hideClose = false, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-1/2 top-1/2 z-modal w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2",
        "max-h-[85vh] overflow-y-auto rounded-feature border border-line bg-surface shadow-elev-4",
        "data-[state=open]:animate-slide-up focus:outline-none",
        className,
      )}
      {...props}
    >
      {title != null && <DialogTitle>{title}</DialogTitle>}
      {description != null && <DialogDescription>{description}</DialogDescription>}
      {children}
      {!hideClose && (
        <DialogPrimitive.Close
          className="absolute right-sm top-sm inline-flex h-11 w-11 items-center justify-center rounded-btn text-ink-muted transition-colors hover:bg-soft-accent hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-strong-accent"
          aria-label="Close"
        >
          <X className="h-5 w-5" aria-hidden />
        </DialogPrimitive.Close>
      )}
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = "DialogContent";

export const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("font-display text-heading-h4 text-ink", className)}
    {...props}
  />
));
DialogTitle.displayName = "DialogTitle";

export const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-body-sm text-ink-muted", className)}
    {...props}
  />
));
DialogDescription.displayName = "DialogDescription";
