"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center font-body font-bold transition-all select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-link focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none",
  {
    variants: {
      variant: {
        cta:
          "bg-cta text-cta-fg hover:bg-cta-hover active:bg-cta-active active:scale-[.98] rounded-btn",
        secondary:
          "bg-transparent text-link border border-link rounded-btn hover:bg-info-tint active:bg-info-tint/60",
        ghost:
          "bg-transparent text-link rounded-none px-0 hover:text-link-hover hover:underline active:text-link-active",
        pill:
          "bg-link text-white rounded-pill hover:bg-link-hover active:bg-link-active",
        "secondary-on-dark":
          "bg-transparent text-white border border-white rounded-btn hover:bg-white/10",
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
