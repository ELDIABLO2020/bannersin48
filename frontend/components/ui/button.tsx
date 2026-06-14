"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center font-body font-bold transition-all select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-strong-accent focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none",
  {
    variants: {
      variant: {
        // Ecwid-green primary CTA
        cta:
          "bg-strong-accent text-white hover:bg-strong-accent-hover active:bg-strong-accent-active active:scale-[.98] rounded-btn",
        // Ecwid-style secondary CTA — white bg, green border
        outline:
          "bg-white text-strong-accent border border-strong-accent rounded-btn hover:bg-soft-accent active:bg-soft-accent-2",
        // Light secondary — transparent, green text, hover tint
        secondary:
          "bg-transparent text-link border border-link rounded-btn hover:bg-soft-accent active:bg-soft-accent-2",
        ghost:
          "bg-transparent text-link rounded-none px-0 hover:text-link-hover hover:underline active:text-link-active",
        pill:
          "bg-link text-white rounded-pill hover:bg-link-hover active:bg-link-active",
        // Kept for backwards compatibility. Resolves to the outline variant since
        // there are no longer any dark hero overlays. New code should use `outline`.
        "secondary-on-dark":
          "bg-white text-strong-accent border border-strong-accent rounded-btn hover:bg-soft-accent",
      },
      size: {
        sm: "h-9 px-md text-sm",
        md: "h-11 px-md text-body",
        lg: "h-12 px-2xl text-body",
        block: "h-12 w-full px-2xl text-body",
      },
    },
    defaultVariants: { variant: "cta", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { buttonVariants };
