import * as React from "react";
import { cn } from "@/lib/utils/cn";

type InputSize = "sm" | "md" | "lg";
type InputVariant = "default" | "pill-left";

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  inputSize?: InputSize;
  variant?: InputVariant;
  invalid?: boolean;
}

const sizeClasses: Record<InputSize, string> = {
  sm: "h-9 text-sm",
  md: "h-10 text-sm",
  lg: "h-12 text-base sm:h-[54px]",
};

const variantClasses: Record<InputVariant, string> = {
  default: "rounded-btn border border-line-input px-md",
  "pill-left": "rounded-l-pill rounded-r-none border border-line-input border-r-0 px-lg",
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, inputSize = "md", variant = "default", invalid, ...props }, ref) => {
    return (
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          "w-full bg-surface text-ink placeholder:text-ink-muted font-input",
          "focus:outline-none focus:border-link focus:shadow-focus",
          "disabled:bg-surface-tint disabled:text-ink-muted disabled:cursor-not-allowed",
          sizeClasses[inputSize],
          variantClasses[variant],
          invalid && "border-danger focus:border-danger focus:shadow-none",
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";
